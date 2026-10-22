import { Router } from 'express';
import { atualizarStatusInstituicao, criarInstituicao, listarInstituicoes, listarInstituicoesAdministracao } from '../controllers/instituicaoController.js';
import { autenticarToken } from '../middlewares/authMiddleware.js';
import { exigirPapelGlobal } from '../middlewares/tenantMiddleware.js';

const router = Router();

// Cadastro precisa listar instituições antes do usuário ter uma sessão.
router.get('/', listarInstituicoes);
router.use(autenticarToken);
router.get('/administracao', exigirPapelGlobal(['SUPERADMIN']), listarInstituicoesAdministracao);
router.post('/', exigirPapelGlobal(['SUPERADMIN']), criarInstituicao);
router.patch('/:id/status', exigirPapelGlobal(['SUPERADMIN']), atualizarStatusInstituicao);

export default router;
