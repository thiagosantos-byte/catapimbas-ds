import sequelize from '../config/database.js';
import Instituicao from '../models/Instituicao.js';
import { registrarAuditoria } from '../utils/auditLogger.js';

export const criarInstituicao = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const nome = String(req.body.nome || '').trim();
    const identificador = String(req.body.identificador || '').trim().toLowerCase();
    const corTema = req.body.corTema ? String(req.body.corTema).trim() : null;
    const logoUrl = req.body.logoUrl ? String(req.body.logoUrl).trim() : null;

    if (nome.length < 2 || !/^[a-z0-9][a-z0-9_-]{1,49}$/.test(identificador)) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Informe um nome válido e um identificador de 2 a 50 caracteres (letras minúsculas, números, hífen ou sublinhado).' });
    }
    if (corTema && !/^#[0-9a-fA-F]{6}$/.test(corTema)) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'corTema deve estar no formato hexadecimal #RRGGBB.' });
    }
    if (logoUrl) {
      try {
        const url = new URL(logoUrl);
        if (url.protocol !== 'https:') throw new Error('invalid protocol');
      } catch {
        await transaction.rollback();
        return res.status(400).json({ mensagem: 'logoUrl deve ser uma URL HTTPS válida.' });
      }
    }

    const novaInstituicao = await Instituicao.create({ nome, identificador, corTema, logoUrl }, { transaction });
    await registrarAuditoria({
      instituicaoId: novaInstituicao.id,
      usuarioId: req.usuario.id,
      operacao: 'CRIAR',
      entidade: 'instituicoes',
      entidadeId: novaInstituicao.id,
      dadosNovos: { nome, identificador, status: novaInstituicao.status },
      transaction,
    });
    await transaction.commit();
    return res.status(201).json(novaInstituicao);
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ mensagem: 'Já existe uma instituição com esse identificador.' });
    }
    console.error('Erro ao criar instituição:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao criar instituição.' });
  }
};

// O cadastro é público, mas só expõe instituições ativas e campos não sensíveis.
export const listarInstituicoes = async (_req, res) => {
  try {
    const instituicoes = await Instituicao.findAll({
      where: { status: 'ATIVA' },
      attributes: ['id', 'nome', 'identificador', 'corTema', 'logoUrl'],
      order: [['nome', 'ASC']],
    });
    return res.json(instituicoes);
  } catch (error) {
    console.error('Erro ao listar instituições:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao listar instituições.' });
  }
};


// Endpoint administrativo: somente superadmin (autorização definida na rota).
export const listarInstituicoesAdministracao = async (_req, res) => {
  try {
    const instituicoes = await Instituicao.findAll({
      attributes: ['id', 'nome', 'identificador', 'status', 'corTema', 'logoUrl', 'criadoEm'],
      order: [['nome', 'ASC']],
    });
    return res.json(instituicoes);
  } catch (error) {
    console.error('Erro ao listar instituições para administração:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao listar instituições.' });
  }
};

export const atualizarStatusInstituicao = async (req, res) => {
  let transaction;
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['ATIVA', 'SUSPENSA'].includes(status)) {
      return res.status(400).json({ mensagem: 'status deve ser ATIVA ou SUSPENSA.' });
    }

    transaction = await sequelize.transaction();
    const instituicao = await Instituicao.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!instituicao) {
      await transaction.rollback();
      return res.status(404).json({ mensagem: 'Instituição não encontrada.' });
    }

    const statusAnterior = instituicao.status;
    if (statusAnterior === status) {
      await transaction.rollback();
      return res.json(instituicao);
    }

    await instituicao.update({ status }, { transaction });
    await registrarAuditoria({
      instituicaoId: instituicao.id,
      usuarioId: req.usuario.id,
      operacao: status === 'SUSPENSA' ? 'SUSPENDER_INSTITUICAO' : 'REATIVAR_INSTITUICAO',
      entidade: 'instituicoes',
      entidadeId: instituicao.id,
      dadosAnteriores: { status: statusAnterior },
      dadosNovos: { status },
      transaction,
    });
    await transaction.commit();
    return res.json(instituicao);
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Erro ao atualizar status da instituição:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao atualizar instituição.' });
  }
};
