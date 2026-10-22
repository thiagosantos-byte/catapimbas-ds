import sequelize from '../config/database.js';
import Avaliacao from '../models/Avaliacao.js';
import BancaAvaliador from '../models/BancaAvaliador.js';
import BancaProjeto from '../models/BancaProjeto.js';
import Banca from '../models/Banca.js';
import BancaCriterio from '../models/BancaCriterio.js';
import Projeto from '../models/Projeto.js';
import Usuario from '../models/Usuario.js';
import { registrarAuditoria } from '../utils/auditLogger.js';

export const submeterAvaliacao = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { bancaId, projetoId, notas } = req.body;
    const avaliadorId = req.usuario.id;
    if (!bancaId || !projetoId || !Array.isArray(notas) || notas.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'bancaId, projetoId e uma lista de notas são obrigatórios.' });
    }

    const banca = await Banca.findByPk(bancaId, { transaction, lock: transaction.LOCK.UPDATE });
    const projeto = await Projeto.findByPk(projetoId, { transaction });
    if (!banca || !projeto) {
      await transaction.rollback();
      return res.status(404).json({ mensagem: 'Banca ou projeto não encontrado.' });
    }
    if (String(banca.instituicaoId) !== String(projeto.instituicaoId) || String(banca.instituicaoId) !== String(req.instituicaoIdAutorizada)) {
      await transaction.rollback();
      return res.status(403).json({ mensagem: 'Banca e projeto devem pertencer à instituição autorizada.' });
    }

    const agora = Date.now();
    if (agora < new Date(banca.periodoInicio).getTime()) {
      await transaction.rollback();
      return res.status(409).json({ mensagem: 'O período de avaliação ainda não começou.' });
    }
    if (agora > new Date(banca.periodoFim).getTime()) {
      if (banca.status !== 'PUBLICADA' && banca.status !== 'CONCLUIDA') {
        await banca.update({ status: 'CONCLUIDA' }, { transaction });
        await transaction.commit();
      } else {
        await transaction.rollback();
      }
      return res.status(409).json({ mensagem: 'O período de avaliação desta banca foi encerrado.' });
    }
    if (banca.status === 'PLANEJADA') {
      await banca.update({ status: 'ABERTA' }, { transaction });
    }
    if (!['ABERTA', 'EM_AVALIACAO'].includes(banca.status)) {
      await transaction.rollback();
      return res.status(409).json({ mensagem: 'A banca não está aberta para avaliações.' });
    }

    const avaliadorDesignado = await BancaAvaliador.findOne({ where: { bancaId, usuarioId: avaliadorId }, transaction });
    if (!avaliadorDesignado) {
      await transaction.rollback();
      return res.status(403).json({ mensagem: 'Apenas avaliadores designados podem lançar notas.' });
    }
    const projetoNaBanca = await BancaProjeto.findOne({ where: { bancaId, projetoId }, transaction });
    if (!projetoNaBanca) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'O projeto não pertence a esta banca.' });
    }

    const criterios = await BancaCriterio.findAll({ where: { bancaId }, transaction });
    if (!criterios.length) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'A banca não possui critérios configurados.' });
    }
    const criteriosPorId = new Map(criterios.map((criterio) => [String(criterio.id), criterio]));
    const idsEnviados = new Set();
    for (const nota of notas) {
      const criterioId = String(nota?.criterioId ?? '');
      const criterio = criteriosPorId.get(criterioId);
      const valor = Number(nota?.valor);
      if (!criterio || !Number.isInteger(valor) || valor < criterio.notaMinima || valor > criterio.notaMaxima || idsEnviados.has(criterioId)) {
        await transaction.rollback();
        return res.status(400).json({ mensagem: 'Notas inválidas: cada critério da banca deve ser informado uma única vez com nota dentro da escala.' });
      }
      idsEnviados.add(criterioId);
    }
    if (idsEnviados.size !== criterios.length) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'A avaliação deve conter nota para todos os critérios da banca.' });
    }

    const novaAvaliacao = await Avaliacao.create({
      instituicaoId: banca.instituicaoId,
      bancaId,
      projetoId,
      avaliadorId,
      notas,
      status: 'SUBMETIDA',
    }, { transaction });
    await registrarAuditoria({
      instituicaoId: banca.instituicaoId,
      usuarioId: avaliadorId,
      operacao: 'SUBMETER',
      entidade: 'avaliacoes',
      entidadeId: novaAvaliacao.id,
      dadosNovos: { bancaId, projetoId, quantidadeCriterios: notas.length },
      transaction,
    });
    await transaction.commit();
    return res.status(201).json(novaAvaliacao);
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Erro ao submeter avaliação:', error.name);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ mensagem: 'Já existe uma avaliação para este projeto e banca por este avaliador.' });
    }
    return res.status(500).json({ mensagem: 'Erro interno ao submeter avaliação.' });
  }
};

export const listarAvaliacoesProjeto = async (req, res) => {
  try {
    const { bancaId, projetoId } = req.params;
    const banca = await Banca.findByPk(bancaId);
    const projeto = await Projeto.findByPk(projetoId);
    if (!banca || !projeto) return res.status(404).json({ mensagem: 'Banca ou projeto não encontrado.' });
    if (banca.instituicaoId !== projeto.instituicaoId || banca.instituicaoId !== req.instituicaoIdAutorizada) return res.status(404).json({ mensagem: 'Recurso não encontrado.' });
    const admin = ['SUPERADMIN', 'ADMIN_INST', 'COORDENADOR'].includes(req.papelAtivo);
    const where = { bancaId, projetoId };
    if (!admin) where.avaliadorId = req.usuario.id;
    const avaliacoes = await Avaliacao.findAll({ where, attributes: admin ? undefined : ['id', 'bancaId', 'projetoId', 'status', 'notas', 'submetidaEm'], include: [{ model: Usuario, as: 'avaliador', attributes: ['id', 'nome'] }] });
    return res.json(avaliacoes);
  } catch (error) {
    console.error('Erro ao listar avaliações:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao listar avaliações.' });
  }
};
