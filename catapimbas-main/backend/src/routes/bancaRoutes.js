import { Router } from 'express';
import { criarBanca, listarBancasPorInstituicao } from '../controllers/bancaController.js';
import { autenticarToken } from '../middlewares/authMiddleware.js';
import { verificarEscopoInstituicao, papeis } from '../middlewares/tenantMiddleware.js';
const router = Router();
router.use(autenticarToken);
router.post('/', verificarEscopoInstituicao(papeis.gestao), criarBanca);
router.get('/instituicao/:instituicaoId', verificarEscopoInstituicao(), listarBancasPorInstituicao);
export default router;
