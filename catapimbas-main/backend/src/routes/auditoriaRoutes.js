import { Router } from 'express';
import { listarLogsPorInstituicao } from '../controllers/auditoriaController.js';
import { autenticarToken } from '../middlewares/authMiddleware.js';
import { verificarEscopoInstituicao, papeis } from '../middlewares/tenantMiddleware.js';
const router = Router();
router.use(autenticarToken);
router.get('/instituicao/:instituicaoId', verificarEscopoInstituicao(papeis.admin), listarLogsPorInstituicao);
export default router;
