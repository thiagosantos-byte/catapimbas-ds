import { Router } from 'express';
import { submeterAvaliacao, listarAvaliacoesProjeto } from '../controllers/avaliacaoController.js';
import { autenticarToken } from '../middlewares/authMiddleware.js';
import { verificarEscopoRecurso } from '../middlewares/tenantMiddleware.js';
const router = Router();
router.use(autenticarToken);
router.post('/', verificarEscopoRecurso('banca', ['AVALIADOR']), submeterAvaliacao);
router.get('/banca/:bancaId/projeto/:projetoId', verificarEscopoRecurso('banca', ['SUPERADMIN', 'ADMIN_INST', 'COORDENADOR', 'AVALIADOR']), listarAvaliacoesProjeto);
export default router;
