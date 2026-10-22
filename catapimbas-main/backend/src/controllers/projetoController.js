import { Op } from 'sequelize';
import db from '../config/database.js';
import Projeto from '../models/Projeto.js';
import ProjetoIntegrante from '../models/ProjetoIntegrante.js';
import Usuario from '../models/Usuario.js';
import VinculoInstitucional from '../models/VinculoInstitucional.js';
import BancaAvaliador from '../models/BancaAvaliador.js';
import BancaProjeto from '../models/BancaProjeto.js';
import { registrarAuditoria } from '../utils/auditLogger.js';

export const criarProjeto = async (req, res) => {
  let transaction;

  try {
    transaction = await db.transaction();
    const { instituicaoId, nome, descricao, ano, semestre, integrantes } = req.body;

    if (!instituicaoId || !String(nome || '').trim() || String(nome).trim().length > 255 || ano === undefined || semestre === undefined) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'instituicaoId, nome, ano e semestre são obrigatórios.' });
    }
    if (!Number.isInteger(Number(ano)) || Number(ano) < 2000 || Number(ano) > 9999 || ![1, 2].includes(Number(semestre))) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'ano deve ser um inteiro entre 2000 e 9999 e semestre deve ser 1 ou 2.' });
    }

    if (String(instituicaoId) !== String(req.instituicaoIdAutorizada)) {
      await transaction.rollback();
      return res.status(403).json({ mensagem: 'Instituição do projeto não corresponde ao escopo autorizado.' });
    }
    if (integrantes !== undefined && !Array.isArray(integrantes)) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'integrantes deve ser uma lista.' });
    }
    for (const integrante of (integrantes || [])) {
      if (!integrante || typeof integrante !== 'object' || Array.isArray(integrante) || !integrante.usuarioId || !['ALUNO', 'ORIENTADOR'].includes(integrante.funcao)) {
        await transaction.rollback();
        return res.status(400).json({ mensagem: 'Cada integrante deve conter usuarioId e função ALUNO ou ORIENTADOR.' });
      }
      const papel = integrante.funcao === 'ALUNO' ? 'ALUNO' : 'ORIENTADOR';
      const vinculo = await VinculoInstitucional.findOne({ where: { usuarioId: integrante.usuarioId, instituicaoId, papel, situacao: 'APROVADO' }, transaction });
      if (!vinculo) {
        await transaction.rollback();
        return res.status(400).json({ mensagem: 'Todos os integrantes devem possuir vínculo aprovado com a instituição e papel correspondente.' });
      }
    }

    const novoProjeto = await Projeto.create({
      instituicaoId,
      nome: String(nome).trim(),
      descricao: descricao == null ? null : String(descricao).trim(),
      ano: Number(ano),
      semestre: Number(semestre)
    }, { transaction });

    if (integrantes && Array.isArray(integrantes) && integrantes.length > 0) {
      const listaIntegrantes = integrantes.map(item => ({
        projetoId: novoProjeto.id,
        usuarioId: item.usuarioId,
        funcao: item.funcao
      }));

      await ProjetoIntegrante.bulkCreate(listaIntegrantes, { transaction });
    }

    await registrarAuditoria({
      instituicaoId,
      usuarioId: req.usuario.id,
      operacao: 'CRIAR',
      entidade: 'projetos',
      entidadeId: novoProjeto.id,
      dadosNovos: { nome: novoProjeto.nome, ano: novoProjeto.ano, semestre: novoProjeto.semestre, quantidadeIntegrantes: (integrantes || []).length },
      transaction,
    });

    await transaction.commit();
    return res.status(201).json(novoProjeto);
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensagem: 'Um ou mais integrantes já estão associados ao projeto.' });
    console.error('Erro ao criar projeto:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao criar projeto.' });
  }
};

export const listarProjetosPorInstituicao = async (req, res) => {
  try {
    const { instituicaoId } = req.params;
    const { busca, ano, semestre, pagina = '1', limite = '20' } = req.query;
    const page = Number(pagina);
    const pageSize = Number(limite);

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return res.status(400).json({ mensagem: 'pagina deve ser positiva e limite deve estar entre 1 e 100.' });
    }

    const where = { instituicaoId };
    if (busca && String(busca).trim()) where.nome = { [Op.iLike]: `%${String(busca).trim()}%` };
    if (ano !== undefined) {
      if (!/^\d{4}$/.test(String(ano))) return res.status(400).json({ mensagem: 'ano deve conter quatro dígitos.' });
      where.ano = Number(ano);
    }
    if (semestre !== undefined) {
      if (!['1', '2'].includes(String(semestre))) return res.status(400).json({ mensagem: 'semestre deve ser 1 ou 2.' });
      where.semestre = Number(semestre);
    }

    const papel = req.papelAtivo;
    const whereIntegrante = (funcao) => ({ usuarioId: req.usuario.id, funcao });
    let idsProjetosAvaliador = null;
    if (papel === 'AVALIADOR') {
      const atribuicoes = await BancaAvaliador.findAll({
        where: { usuarioId: req.usuario.id },
        attributes: ['bancaId'],
      });
      const bancaIds = atribuicoes.map((item) => item.bancaId);
      const participacoes = bancaIds.length
        ? await BancaProjeto.findAll({ where: { bancaId: bancaIds }, attributes: ['projetoId'] })
        : [];
      idsProjetosAvaliador = [...new Set(participacoes.map((item) => item.projetoId))];
      where.id = { [Op.in]: idsProjetosAvaliador };
    } else if (!['SUPERADMIN', 'ADMIN_INST', 'COORDENADOR', 'ALUNO', 'ORIENTADOR'].includes(papel)) {
      return res.status(403).json({ mensagem: 'Perfil sem permissão para listar projetos.' });
    }

    const includeIntegrantes = {
      model: ProjetoIntegrante,
      as: 'integrantes',
      attributes: ['id', 'usuarioId', 'funcao'],
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nome'] }],
    };
    if (papel === 'ALUNO' || papel === 'ORIENTADOR') {
      includeIntegrantes.where = whereIntegrante(papel);
      includeIntegrantes.required = true;
    }

    const projetos = await Projeto.findAll({
      where,
      attributes: ['id', 'instituicaoId', 'nome', 'descricao', 'ano', 'semestre', 'status', 'criadoEm'],
      include: [includeIntegrantes],
      order: [['criadoEm', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
    });

    res.setHeader('X-Pagina-Atual', String(page));
    res.setHeader('X-Limite-Pagina', String(pageSize));
    return res.json(projetos);
  } catch (error) {
    console.error('Erro ao listar projetos:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao listar projetos.' });
  }
};
