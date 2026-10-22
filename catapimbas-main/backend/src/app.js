import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import instituicaoRoutes from './routes/instituicaoRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import vinculoRoutes from './routes/vinculoRoutes.js';
import projetoRoutes from './routes/projetoRoutes.js';
import bancaRoutes from './routes/bancaRoutes.js';
import avaliacaoRoutes from './routes/avaliacaoRoutes.js';
import rankingRoutes from './routes/rankingRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import relatorioRoutes from './routes/relatorioRoutes.js';
import auditoriaRoutes from './routes/auditoriaRoutes.js';
import assistenteRoutes from './routes/assistenteRoutes.js';

const app = express();

const production = process.env.NODE_ENV === 'production';

/* =========================================
   CONFIGURAÇÃO DE CORS
   ========================================= */

const rawOrigins =
  process.env.CORS_ORIGIN ||
  (production ? '' : 'http://localhost:5173');

const allowedOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

for (const origin of allowedOrigins) {
  let parsed;

  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(
      'CORS_ORIGIN contém uma URL inválida.'
    );
  }

  if (parsed.origin !== origin) {
    throw new Error(
      'CORS_ORIGIN deve conter apenas protocolo, domínio ' +
      'e porta opcional, sem caminho.'
    );
  }

  if (production && parsed.protocol !== 'https:') {
    throw new Error(
      'CORS_ORIGIN deve usar HTTPS em produção.'
    );
  }
}

/* =========================================
   CONFIGURAÇÕES GERAIS
   ========================================= */

app.disable('x-powered-by');

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

/* =========================================
   CABEÇALHOS DE SEGURANÇA E REQUEST ID
   ========================================= */

app.use((req, res, next) => {
  const requestId = randomUUID();

  res.locals.requestId = requestId;

  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');

  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  res.setHeader(
    'Cross-Origin-Opener-Policy',
    'same-origin'
  );

  res.setHeader('Cache-Control', 'no-store');

  if (production) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  next();
});

/* =========================================
   MIDDLEWARE CORS
   ========================================= */

app.use(
  cors({
    origin: (origin, callback) => {
      // Clientes que não enviam Origin, como algumas
      // ferramentas de monitoramento, são tratados separadamente.
      // Isso não substitui autenticação nas rotas protegidas.
      if (!origin) {
        return callback(null, true);
      }

      const normalized = origin.replace(/\/$/, '');

      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }

      return callback(
        new Error(
          'Origem não permitida pela política CORS.'
        )
      );
    },

    credentials: false,

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Papel-Ativo',
      'X-Request-ID',
    ],

    exposedHeaders: [
      'X-Request-ID',
      'X-Pagina-Atual',
      'X-Limite-Pagina',
      'Content-Disposition',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'Retry-After',
    ],

    methods: [
      'GET',
      'HEAD',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    maxAge: 600,
  })
);

/* =========================================
   LEITURA DO CORPO DAS REQUISIÇÕES
   ========================================= */

app.use(
  express.json({
    limit: '1mb',
    strict: true,
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: '32kb',
  })
);

app.use((req, _res, next) => {
  if (
    req.body == null &&
    ['POST', 'PUT', 'PATCH'].includes(req.method)
  ) {
    req.body = {};
  }

  next();
});

/* =========================================
   ROTAS DE SAÚDE
   ========================================= */

app.get('/', (_req, res) => {
  res.json({
    mensagem: 'API Integrador rodando com sucesso!',
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
  });
});

app.get('/ready', async (_req, res) => {
  try {
    const { default: sequelize } = await import(
      './config/database.js'
    );

    await sequelize.authenticate();

    return res.status(200).json({
      status: 'ready',
      database: 'ok',
    });
  } catch {
    return res.status(503).json({
      status: 'not_ready',
    });
  }
});

/* =========================================
   ROTAS DA API
   ========================================= */

app.use('/api/auth', authRoutes);

app.use('/api/instituicoes', instituicaoRoutes);

app.use('/api/usuarios', usuarioRoutes);

app.use('/api/vinculos', vinculoRoutes);

app.use('/api/projetos', projetoRoutes);

app.use('/api/bancas', bancaRoutes);

app.use('/api/avaliacoes', avaliacaoRoutes);

app.use('/api/ranking', rankingRoutes);

app.use('/api/dashboard', dashboardRoutes);

app.use('/api/relatorios', relatorioRoutes);

app.use('/api/auditoria', auditoriaRoutes);

/* Assistente de inteligência artificial */
app.use('/api/assistente', assistenteRoutes);

/* =========================================
   ROTAS NÃO ENCONTRADAS
   ========================================= */

app.use('/api', (_req, res) => {
  res.status(404).json({
    codigo: 'ROTA_NAO_ENCONTRADA',
    mensagem: 'Endpoint da API não encontrado.',
    requestId: res.locals.requestId,
  });
});

app.use((_req, res) => {
  res.status(404).json({
    codigo: 'NAO_ENCONTRADO',
    mensagem: 'Recurso não encontrado.',
    requestId: res.locals.requestId,
  });
});

/* =========================================
   TRATAMENTO CENTRALIZADO DE ERROS
   ========================================= */

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (
    err?.message ===
    'Origem não permitida pela política CORS.'
  ) {
    return res.status(403).json({
      codigo: 'CORS_ORIGIN_NEGADA',
      mensagem: err.message,
      requestId: res.locals.requestId,
    });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      codigo: 'CORPO_MUITO_GRANDE',
      mensagem:
        'O corpo da requisição excede o limite permitido.',
      requestId: res.locals.requestId,
    });
  }

  if (
    err instanceof SyntaxError &&
    Object.prototype.hasOwnProperty.call(err, 'body')
  ) {
    return res.status(400).json({
      codigo: 'JSON_INVALIDO',
      mensagem:
        'O corpo JSON da requisição é inválido.',
      requestId: res.locals.requestId,
    });
  }

  console.error(
    JSON.stringify({
      level: 'error',
      event: 'api_unhandled_error',
      requestId: res.locals.requestId,
      method: req.method,
      path: req.path,
      error: err?.name || 'Error',
    })
  );

  return res.status(500).json({
    codigo: 'ERRO_INTERNO',
    mensagem: 'Erro interno do servidor.',
    requestId: res.locals.requestId,
  });
});

export default app;