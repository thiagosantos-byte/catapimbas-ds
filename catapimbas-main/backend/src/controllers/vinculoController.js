import sequelize from '../config/database.js';
import VinculoInstitucional from '../models/VinculoInstitucional.js';
import Usuario from '../models/Usuario.js';
import Instituicao from '../models/Instituicao.js';
import { registrarAuditoria } from '../utils/auditLogger.js';

const PAPEIS_SOLICITAVEIS = ['COORDENADOR', 'ORIENTADOR', 'AVALIADOR', 'ALUNO'];

export const solicitarIngresso = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { instituicaoId, papel } = req.body;
    const usuarioId = req.usuario.id;

    if (!instituicaoId || !papel) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'instituicaoId e papel são obrigatórios.' });
    }
    if (!PAPEIS_SOLICITAVEIS.includes(papel)) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Papel solicitado inválido.' });
    }

    const instituicao = await Instituicao.findOne({ where: { id: instituicaoId, status: 'ATIVA' }, transaction });
    if (!instituicao) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Instituição inexistente ou inativa.' });
    }

    const vinculoExistente = await VinculoInstitucional.findOne({ where: { usuarioId, instituicaoId, papel }, transaction });
    if (vinculoExistente) {
      await transaction.rollback();
      return res.status(409).json({ mensagem: 'Já existe uma solicitação ou vínculo com este papel para esta instituição.' });
    }

    const novoVinculo = await VinculoInstitucional.create({
      usuarioId,
      instituicaoId,
      papel,
      situacao: 'PENDENTE',
    }, { transaction });

    await registrarAuditoria({
      instituicaoId,
      usuarioId,
      operacao: 'SOLICITAR_INGRESSO',
      entidade: 'vinculos_institucionais',
      entidadeId: novoVinculo.id,
      dadosNovos: { papel, situacao: 'PENDENTE' },
      transaction,
    });
    await transaction.commit();
    return res.status(201).json(novoVinculo);
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ mensagem: 'Já existe uma solicitação ou vínculo com este papel para esta instituição.' });
    }
    console.error('Erro ao solicitar ingresso:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao solicitar ingresso.' });
  }
};

export const decidirIngresso = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { id } = req.params;
    const { situacao, justificativaRecusa } = req.body;

    if (!['APROVADO', 'RECUSADO'].includes(situacao)) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'A situação deve ser APROVADO ou RECUSADO.' });
    }
    if (situacao === 'RECUSADO' && !String(justificativaRecusa || '').trim()) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'A justificativa é obrigatória em caso de recusa.' });
    }

    // Recarrega com bloqueio para impedir decisões concorrentes sobre a mesma solicitação.
    const vinculo = await VinculoInstitucional.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!vinculo || (req.vinculoAlvo && String(vinculo.instituicaoId) !== String(req.instituicaoIdAutorizada))) {
      await transaction.rollback();
      return res.status(404).json({ mensagem: 'Solicitação de vínculo não encontrada.' });
    }
    if (vinculo.situacao !== 'PENDENTE') {
      await transaction.rollback();
      return res.status(409).json({ mensagem: 'Somente solicitações pendentes podem receber decisão.' });
    }

    const justificativa = situacao === 'RECUSADO' ? String(justificativaRecusa).trim() : null;
    await vinculo.update({ situacao, justificativaRecusa: justificativa, decididoPorUsuarioId: req.usuario.id }, { transaction });
    await registrarAuditoria({
      instituicaoId: vinculo.instituicaoId,
      usuarioId: req.usuario.id,
      operacao: situacao,
      entidade: 'vinculos_institucionais',
      entidadeId: vinculo.id,
      dadosNovos: { situacao, justificativaRecusa: justificativa },
      transaction,
    });
    await transaction.commit();
    return res.json(vinculo);
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Erro ao decidir ingresso:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao processar a decisão.' });
  }
};

// Visão global de solicitações: exclusiva do SUPERADMIN. Isso evita que pedidos
// enviados a uma instituição diferente da instituição inicial fiquem invisíveis.
export const listarSolicitacoesGlobais = async (_req, res) => {
  try {
    const vinculos = await VinculoInstitucional.findAll({
      where: { situacao: ['PENDENTE', 'APROVADO', 'RECUSADO', 'REVOGADO'] },
      include: [
        { model: Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] },
        { model: Instituicao, as: 'instituicao', attributes: ['id', 'nome', 'identificador', 'status'] },
      ],
      order: [['criadoEm', 'DESC']],
      limit: 500,
    });
    return res.json(vinculos);
  } catch (error) {
    console.error('Erro ao listar solicitações globais:', error.name);
    return res.status(500).json({ mensagem: 'Não foi possível carregar as solicitações agora.' });
  }
};

export const solicitarNovamente = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const vinculo = await VinculoInstitucional.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!vinculo || String(vinculo.usuarioId) !== String(req.usuario.id)) {
      await transaction.rollback();
      return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });
    }
    if (!['RECUSADO', 'REVOGADO'].includes(vinculo.situacao)) {
      await transaction.rollback();
      return res.status(409).json({ mensagem: 'Somente solicitações recusadas ou vínculos revogados podem ser enviados novamente.' });
    }
    const instituicao = await Instituicao.findOne({ where: { id: vinculo.instituicaoId, status: 'ATIVA' }, transaction });
    if (!instituicao) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Esta instituição está indisponível para novas solicitações.' });
    }
    const situacaoAnterior = vinculo.situacao;
    await vinculo.update({ situacao: 'PENDENTE', justificativaRecusa: null, decididoPorUsuarioId: null }, { transaction });
    await registrarAuditoria({
      instituicaoId: vinculo.instituicaoId,
      usuarioId: req.usuario.id,
      operacao: 'REENVIAR_SOLICITACAO',
      entidade: 'vinculos_institucionais',
      entidadeId: vinculo.id,
      dadosAnteriores: { situacao: situacaoAnterior },
      dadosNovos: { situacao: 'PENDENTE', papel: vinculo.papel },
      transaction,
    });
    await transaction.commit();
    return res.json({ mensagem: 'Sua solicitação foi enviada novamente para análise.', vinculo });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Erro ao reenviar solicitação:', error.name);
    return res.status(500).json({ mensagem: 'Não foi possível reenviar a solicitação agora.' });
  }
};

export const revogarVinculo = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const vinculo = await VinculoInstitucional.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!vinculo || String(vinculo.instituicaoId) !== String(req.instituicaoIdAutorizada)) {
      await transaction.rollback();
      return res.status(404).json({ mensagem: 'Vínculo não encontrado.' });
    }
    if (vinculo.situacao !== 'APROVADO') {
      await transaction.rollback();
      return res.status(409).json({ mensagem: 'Somente vínculos aprovados podem ser revogados.' });
    }
    if (vinculo.papel === 'SUPERADMIN' && String(vinculo.usuarioId) === String(req.usuario.id)) {
      await transaction.rollback();
      return res.status(409).json({ mensagem: 'Você não pode revogar seu próprio acesso de superadministrador.' });
    }
    await vinculo.update({ situacao: 'REVOGADO', decididoPorUsuarioId: req.usuario.id }, { transaction });
    await registrarAuditoria({
      instituicaoId: vinculo.instituicaoId,
      usuarioId: req.usuario.id,
      operacao: 'REVOGAR_VINCULO',
      entidade: 'vinculos_institucionais',
      entidadeId: vinculo.id,
      dadosAnteriores: { situacao: 'APROVADO', papel: vinculo.papel },
      dadosNovos: { situacao: 'REVOGADO', papel: vinculo.papel },
      transaction,
    });
    await transaction.commit();
    return res.json({ mensagem: 'Acesso institucional revogado.', vinculo });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Erro ao revogar vínculo:', error.name);
    return res.status(500).json({ mensagem: 'Não foi possível revogar o acesso agora.' });
  }
};

export const listarPorInstituicao = async (req, res) => {
  try {
    const { instituicaoId } = req.params;
    const where = { instituicaoId };
    // Coordenadores podem consultar apenas vínculos aprovados para associar pessoas
    // a projetos e bancas; somente administradores veem e decidem solicitações.
    const isAdmin = ['SUPERADMIN', 'ADMIN_INST'].includes(req.papelAtivo);
    if (!isAdmin) where.situacao = 'APROVADO';
    const vinculos = await VinculoInstitucional.findAll({
      where,
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nome', ...(isAdmin ? ['email'] : [])] }],
      order: [['criadoEm', 'DESC']],
    });
    return res.json(vinculos);
  } catch (error) {
    console.error('Erro ao listar vínculos:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao listar vínculos.' });
  }
};


// Provisionamento restrito: somente um superadministrador pode atribuir o papel ADMIN_INST.
// O cadastro público nunca aceita esse papel para impedir autoelevação de privilégios.
export const designarAdministradorInstitucional = async (req, res) => {
  let transaction;
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const instituicaoId = String(req.body?.instituicaoId || '');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !instituicaoId) {
      return res.status(400).json({ mensagem: 'Informe um e-mail válido e a instituição.' });
    }
    transaction = await sequelize.transaction();
    const [usuario, instituicao] = await Promise.all([
      Usuario.findOne({ where: { email }, transaction, lock: transaction.LOCK.UPDATE }),
      Instituicao.findByPk(instituicaoId, { transaction, lock: transaction.LOCK.UPDATE }),
    ]);
    if (!usuario) {
      await transaction.rollback();
      return res.status(404).json({ mensagem: 'Não existe uma conta com esse e-mail. A pessoa deve se cadastrar primeiro.' });
    }
    if (!instituicao || instituicao.status !== 'ATIVA') {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Instituição não encontrada ou inativa.' });
    }
    let vinculo = await VinculoInstitucional.findOne({ where: { usuarioId: usuario.id, instituicaoId, papel: 'ADMIN_INST' }, transaction, lock: transaction.LOCK.UPDATE });
    const situacaoAnterior = vinculo?.situacao || null;
    if (vinculo) {
      if (vinculo.situacao === 'APROVADO') {
        await transaction.rollback();
        return res.status(409).json({ mensagem: 'Esta pessoa já é administradora desta instituição.' });
      }
      await vinculo.update({ situacao: 'APROVADO', justificativaRecusa: null, decididoPorUsuarioId: req.usuario.id }, { transaction });
    } else {
      vinculo = await VinculoInstitucional.create({ usuarioId: usuario.id, instituicaoId, papel: 'ADMIN_INST', situacao: 'APROVADO', decididoPorUsuarioId: req.usuario.id }, { transaction });
    }
    await registrarAuditoria({
      instituicaoId,
      usuarioId: req.usuario.id,
      operacao: 'DESIGNAR_ADMIN_INST',
      entidade: 'vinculos_institucionais',
      entidadeId: vinculo.id,
      dadosAnteriores: { situacao: situacaoAnterior, papel: 'ADMIN_INST' },
      dadosNovos: { usuarioId: usuario.id, email: usuario.email, situacao: 'APROVADO', papel: 'ADMIN_INST' },
      transaction,
    });
    await transaction.commit();
    return res.status(201).json({ mensagem: 'Administrador institucional designado com sucesso.', vinculo: { id: vinculo.id, usuarioId: usuario.id, instituicaoId, papel: 'ADMIN_INST', situacao: 'APROVADO' } });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Erro ao designar administrador institucional:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao designar administrador institucional.' });
  }
};
