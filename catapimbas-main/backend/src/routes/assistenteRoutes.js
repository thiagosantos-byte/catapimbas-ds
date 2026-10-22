import { Router } from 'express';

import {
  responderAssistente,
} from '../controllers/assistenteController.js';

import {
  autenticarToken,
} from '../middlewares/authMiddleware.js';

import {
  createRateLimiter,
} from '../middlewares/rateLimitMiddleware.js';

const router = Router();

const limitarAssistente = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message:
    'Você atingiu o limite de perguntas. Aguarde e tente novamente.',
});

// O assistente só pode ser utilizado por usuários autenticados.
router.use(autenticarToken);

router.post(
  '/chat',
  limitarAssistente,
  responderAssistente
);

export default router;