import { Router } from 'express';
import { login, obterPerfil, registrarConta, solicitarRedefinicaoSenha, redefinirSenha } from '../controllers/authController.js';
import { autenticarToken } from '../middlewares/authMiddleware.js';
import { limitarCadastro, limitarLogin, limitarRecuperacaoSenha } from '../middlewares/rateLimitMiddleware.js';

const router = Router();
router.post('/login', limitarLogin, login);
router.post('/register', limitarCadastro, registrarConta);
router.post('/forgot-password', limitarRecuperacaoSenha, solicitarRedefinicaoSenha);
router.post('/reset-password', limitarRecuperacaoSenha, redefinirSenha);
router.get('/me', autenticarToken, obterPerfil);
export default router;
