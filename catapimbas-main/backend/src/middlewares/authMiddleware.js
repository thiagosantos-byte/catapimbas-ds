import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import { JWT_AUDIENCE, JWT_ISSUER, segredoJwtAdequado } from '../config/security.js';

export const autenticarToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return res.status(401).json({ codigo: 'AUTENTICACAO_OBRIGATORIA', mensagem: 'Autenticação obrigatória.' });
  if (!segredoJwtAdequado(process.env.JWT_SECRET)) {
    return res.status(500).json({ codigo: 'AUTENTICACAO_NAO_CONFIGURADA', mensagem: 'Configuração de autenticação indisponível.' });
  }

  let tokenDecodificado;
  try {
    tokenDecodificado = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof tokenDecodificado?.id !== 'string') {
      return res.status(401).json({ codigo: 'TOKEN_INVALIDO', mensagem: 'Token inválido ou expirado.' });
    }
  } catch {
    return res.status(401).json({ codigo: 'TOKEN_INVALIDO', mensagem: 'Token inválido ou expirado.' });
  }

  try {
    // State is always read from the DB so a block takes effect before JWT expiry.
    const usuario = await Usuario.findByPk(tokenDecodificado.id, {
      attributes: ['id', 'nome', 'email', 'status'],
    });
    if (!usuario) return res.status(401).json({ codigo: 'CONTA_NAO_ENCONTRADA', mensagem: 'Conta não encontrada.' });
    if (usuario.status !== 'ATIVO') {
      return res.status(403).json({ codigo: 'CONTA_BLOQUEADA', mensagem: 'Sua conta está bloqueada no sistema.' });
    }
    req.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email };
    return next();
  } catch (error) {
    return next(error);
  }
};
