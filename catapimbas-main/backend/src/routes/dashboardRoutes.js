import { Router } from 'express';
import { obterMetricasDashboard } from '../controllers/dashboardController.js';
import { autenticarToken } from '../middlewares/authMiddleware.js';
import { verificarEscopoInstituicao, papeis } from '../middlewares/tenantMiddleware.js';
const router = Router();
router.use(autenticarToken);
router.get('/instituicao/:instituicaoId', verificarEscopoInstituicao(papeis.gestao), obterMetricasDashboard);
export default router;
