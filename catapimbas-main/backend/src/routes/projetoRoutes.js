import { Router } from 'express';
import { criarProjeto, listarProjetosPorInstituicao } from '../controllers/projetoController.js';
import { autenticarToken } from '../middlewares/authMiddleware.js';
import { verificarEscopoInstituicao, papeis } from '../middlewares/tenantMiddleware.js';
const router = Router();
router.use(autenticarToken);
router.post('/', verificarEscopoInstituicao(papeis.gestao), criarProjeto);
router.get('/instituicao/:instituicaoId', verificarEscopoInstituicao(), listarProjetosPorInstituicao);
export default router;
