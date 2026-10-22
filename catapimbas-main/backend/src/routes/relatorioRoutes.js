import { Router } from 'express';
import { exportarRankingExcel } from '../controllers/relatorioController.js';
import { autenticarToken } from '../middlewares/authMiddleware.js';
import { verificarEscopoRecurso } from '../middlewares/tenantMiddleware.js';
const router = Router();
router.get('/banca/:bancaId/excel', autenticarToken, verificarEscopoRecurso('banca'), exportarRankingExcel);
export default router;
