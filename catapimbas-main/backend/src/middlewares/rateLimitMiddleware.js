/**
 * Processo-local protection for auth endpoints. Use provider/WAF controls or a
 * distributed store if the API is scaled to multiple instances.
 */
export const createRateLimiter = ({ windowMs, max, message }) => {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = String(req.ip || req.socket?.remoteAddress || 'unknown');
    let entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }
    entry.count += 1;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    // Bound memory under high-cardinality source-IP traffic.
    if (buckets.size > 10_000) {
      for (const [storedKey, storedValue] of buckets) {
        if (storedValue.resetAt <= now) buckets.delete(storedKey);
        if (buckets.size <= 8_000) break;
      }
    }
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
      return res.status(429).json({ codigo: 'MUITAS_TENTATIVAS', mensagem: message });
    }
    return next();
  };
};

export const limitarLogin = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de autenticação. Aguarde antes de tentar novamente.',
});

export const limitarCadastro = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: 'Muitas solicitações de cadastro desta origem. Tente novamente mais tarde.',
});

export const limitarRecuperacaoSenha = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de recuperação. Aguarde antes de tentar novamente.',
});
