import sequelize from '../config/database.js';
import { Op } from 'sequelize';
import Banca from '../models/Banca.js';
import BancaCriterio from '../models/BancaCriterio.js';
import BancaProjeto from '../models/BancaProjeto.js';
import BancaAvaliador from '../models/BancaAvaliador.js';
import Projeto from '../models/Projeto.js';
import Usuario from '../models/Usuario.js';
import VinculoInstitucional from '../models/VinculoInstitucional.js';
import ProjetoIntegrante from '../models/ProjetoIntegrante.js';
import { registrarAuditoria } from '../utils/auditLogger.js';

export const criarBanca = async (req, res) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();
    const { 
      instituicaoId, 
      nome, 
      periodoInicio, 
      periodoFim, 
      politicaDesempate,
      casasDecimais,
      criterios, 
      projetosIds, 
      avaliadoresIds 
    } = req.body;

    if (!instituicaoId || !String(nome || '').trim() || String(nome).trim().length > 255 || !periodoInicio || !periodoFim) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'instituicaoId, nome, periodoInicio e periodoFim são obrigatórios.' });
    }

    if (String(instituicaoId) !== String(req.instituicaoIdAutorizada)) {
      await transaction.rollback();
      return res.status(403).json({ mensagem: 'Instituição da banca não corresponde ao escopo autorizado.' });
    }
    if (!Array.isArray(criterios) || !Array.isArray(projetosIds) || !Array.isArray(avaliadoresIds)) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'criterios, projetosIds e avaliadoresIds devem ser listas.' });
    }
    if (!['EMPATE_COMPARTILHADO', 'NOME_PROJETO'].includes(politicaDesempate)) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'politicaDesempate deve ser EMPATE_COMPARTILHADO ou NOME_PROJETO.' });
    }
    if (criterios.length === 0 || projetosIds.length === 0 || avaliadoresIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Configure ao menos um critério, um projeto e um avaliador na banca.' });
    }
    if (new Set(projetosIds.map(String)).size !== projetosIds.length || new Set(avaliadoresIds.map(String)).size !== avaliadoresIds.length) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Não repita o mesmo projeto ou avaliador na configuração da banca.' });
    }
    const titulosCriterios = criterios.map((c) => String(c && typeof c === 'object' ? c.titulo || '' : '').trim().toLocaleLowerCase('pt-BR'));
    if (new Set(titulosCriterios).size !== titulosCriterios.length) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Cada critério da banca deve ter um título único.' });
    }
    const casasDecimaisValidadas = Number(casasDecimais ?? 2);
    if (!Number.isInteger(casasDecimaisValidadas) || casasDecimaisValidadas < 0 || casasDecimaisValidadas > 4) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'casasDecimais deve ser um inteiro de 0 a 4.' });
    }
    const inicio = new Date(periodoInicio);
    const fim = new Date(periodoFim);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim <= inicio) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'O período da banca é inválido.' });
    }
    if (criterios.some((c) => {
      if (!c || typeof c !== 'object' || Array.isArray(c)) return true;
      const minimo = Number(c.notaMinima ?? 1);
      const maximo = Number(c.notaMaxima ?? 5);
      return !String(c.titulo || '').trim() || !Number.isFinite(Number(c.peso)) || Number(c.peso) <= 0 || Number(c.peso) > 999.99
        || !Number.isInteger(minimo) || !Number.isInteger(maximo) || minimo < 1 || maximo > 5 || minimo >= maximo;
    })) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Critérios inválidos: título, peso positivo e escala inteira entre 1 e 5 são obrigatórios.' });
    }
    for (const projetoId of (projetosIds || [])) {
      const projeto = await Projeto.findByPk(projetoId, { transaction });
      if (!projeto || String(projeto.instituicaoId) !== String(instituicaoId)) {
        await transaction.rollback();
        return res.status(400).json({ mensagem: 'Todos os projetos da banca devem pertencer à instituição da banca.' });
      }
    }
    for (const usuarioId of (avaliadoresIds || [])) {
      const vinculo = await VinculoInstitucional.findOne({ where: { usuarioId, instituicaoId, papel: 'AVALIADOR', situacao: 'APROVADO' }, transaction });
      if (!vinculo) {
        await transaction.rollback();
        return res.status(400).json({ mensagem: 'Todos os avaliadores devem possuir vínculo aprovado como avaliador nesta instituição.' });
      }
    }

    const novaBanca = await Banca.create({
      instituicaoId,
      nome: String(nome).trim(),
      periodoInicio,
      periodoFim,
      politicaDesempate,
      regraNotasAusentes: 'Avaliações incompletas são excluídas; projetos sem avaliações válidas recebem zero.',
      casasDecimais: casasDecimaisValidadas,
      status: Date.now() < inicio.getTime() ? 'PLANEJADA' : (Date.now() <= fim.getTime() ? 'ABERTA' : 'CONCLUIDA')
    }, { transaction });

    if (criterios && Array.isArray(criterios) && criterios.length > 0) {
      const listaCriterios = criterios.map(c => ({
        bancaId: novaBanca.id,
        titulo: String(c.titulo).trim(),
        descricao: c.descricao,
        peso: c.peso,
        notaMinima: c.notaMinima ?? 1,
        notaMaxima: c.notaMaxima ?? 5,
        rubricas: c.rubricas || []
      }));
      await BancaCriterio.bulkCreate(listaCriterios, { transaction });
    }

    if (projetosIds && Array.isArray(projetosIds) && projetosIds.length > 0) {
      const listaProjetos = projetosIds.map(pId => ({
        bancaId: novaBanca.id,
        projetoId: pId,
        elegivelRanking: true
      }));
      await BancaProjeto.bulkCreate(listaProjetos, { transaction });
    }

    if (avaliadoresIds && Array.isArray(avaliadoresIds) && avaliadoresIds.length > 0) {
      const listaAvaliadores = avaliadoresIds.map(uId => ({
        bancaId: novaBanca.id,
        usuarioId: uId
      }));
      await BancaAvaliador.bulkCreate(listaAvaliadores, { transaction });
    }

    await registrarAuditoria({
      instituicaoId,
      usuarioId: req.usuario.id,
      operacao: 'CRIAR',
      entidade: 'bancas',
      entidadeId: novaBanca.id,
      dadosNovos: { nome: novaBanca.nome, quantidadeCriterios: criterios.length, quantidadeProjetos: projetosIds.length, quantidadeAvaliadores: avaliadoresIds.length },
      transaction,
    });
    await transaction.commit();

    return res.status(201).json(novaBanca);
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Erro ao criar banca:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao criar banca.' });
  }
};

export const listarBancasPorInstituicao = async (req, res) => {
  try {
    const { instituicaoId } = req.params;
    const papel = req.papelAtivo;
    const where = { instituicaoId };
    let projetosVisiveis = null;

    if (['SUPERADMIN', 'ADMIN_INST', 'COORDENADOR'].includes(papel)) {
      // Gestão institucional pode consultar todas as bancas da instituição.
    } else if (papel === 'AVALIADOR') {
      const atribuicoes = await BancaAvaliador.findAll({ where: { usuarioId: req.usuario.id }, attributes: ['bancaId'] });
      where.id = { [Op.in]: [...new Set(atribuicoes.map((item) => item.bancaId))] };
    } else if (papel === 'ALUNO' || papel === 'ORIENTADOR') {
      const integrantes = await ProjetoIntegrante.findAll({
        where: { usuarioId: req.usuario.id, funcao: papel },
        attributes: ['projetoId'],
      });
      projetosVisiveis = [...new Set(integrantes.map((item) => item.projetoId))];
      const participacoes = projetosVisiveis.length
        ? await BancaProjeto.findAll({ where: { projetoId: projetosVisiveis }, attributes: ['bancaId'] })
        : [];
      where.id = { [Op.in]: [...new Set(participacoes.map((item) => item.bancaId))] };
    } else {
      return res.status(403).json({ mensagem: 'Perfil sem permissão para listar bancas.' });
    }

    const includeBancaProjetos = {
      model: BancaProjeto,
      as: 'bancaProjetos',
      include: [{ model: Projeto, as: 'projeto', attributes: ['id', 'nome'] }],
    };
    // Alunos/orientadores só recebem a associação aos próprios projetos, não à lista completa da banca.
    if (projetosVisiveis !== null) {
      includeBancaProjetos.where = { projetoId: { [Op.in]: projetosVisiveis } };
      includeBancaProjetos.required = false;
    }

    const bancas = await Banca.findAll({
      where,
      include: [
        { model: BancaCriterio, as: 'criterios' },
        includeBancaProjetos,
        {
          model: BancaAvaliador,
          as: 'bancaAvaliadores',
          include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nome'] }],
        },
      ],
      order: [['periodoInicio', 'DESC']],
    });

    return res.json(bancas);
  } catch (error) {
    console.error('Erro ao listar bancas:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao listar bancas.' });
  }
};
