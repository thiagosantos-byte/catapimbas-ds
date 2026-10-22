import { Router } from 'express';
import { listarUsuarios } from '../controllers/usuarioController.js';
import { autenticarToken } from '../middlewares/authMiddleware.js';
import { exigirPapelGlobal } from '../middlewares/tenantMiddleware.js';
const router = Router();

// O cadastro público oficial é POST /api/auth/register: ele cria a conta e o vínculo
// PENDENTE na mesma transação. Esta listagem é restrita ao superadministrador.
router.get('/', autenticarToken, exigirPapelGlobal(['SUPERADMIN']), listarUsuarios);
export default router;
