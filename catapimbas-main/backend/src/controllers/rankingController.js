import sequelize from '../config/database.js';
import Banca from '../models/Banca.js';
import BancaCriterio from '../models/BancaCriterio.js';
import BancaProjeto from '../models/BancaProjeto.js';
import Avaliacao from '../models/Avaliacao.js';
import ResultadoProjeto from '../models/ResultadoProjeto.js';
import Projeto from '../models/Projeto.js';
import { calcularNotaAvaliacao, classificarResultados } from '../services/rankingService.js';
import { registrarAuditoria } from '../utils/auditLogger.js';

export const calcularRankingBanca = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { bancaId } = req.params;
    // Compartilha o mesmo bloqueio de linha usado na submissão de notas: o cálculo
    // não lê uma coleção de avaliações enquanto outra submissão a altera.
    const banca = await Banca.findByPk(bancaId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!banca) {
      await transaction.rollback();
      return res.status(404).json({ mensagem: 'Banca não encontrada.' });
    }
    if (banca.status === 'PUBLICADA') {
      await transaction.rollback();
      return res.status(409).json({ mensagem: 'O ranking publicado é imutável. Reabra a banca por fluxo administrativo auditado antes de recalcular.' });
    }
    if (!['EMPATE_COMPARTILHADO', 'NOME_PROJETO'].includes(banca.politicaDesempate)) {
      await transaction.rollback();
      return res.status(409).json({ mensagem: 'Defina uma política de desempate válida antes de calcular o ranking.' });
    }
    const criterios = await BancaCriterio.findAll({ where: { bancaId }, transaction });
    if (!criterios.length) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'A banca precisa ter ao menos um critério configurado.' });
    }

    const bancaProjetos = await BancaProjeto.findAll({
      where: { bancaId, elegivelRanking: true },
      include: [{ model: Projeto, as: 'projeto', attributes: ['id', 'nome'] }],
      transaction,
    });
    const casasDecimais = Math.min(4, Math.max(0, Number(banca.casasDecimais ?? 2)));
    const resultados = [];

    for (const bancaProjeto of bancaProjetos) {
      const avaliacoes = await Avaliacao.findAll({
        where: {
          bancaId,
          projetoId: bancaProjeto.projetoId,
          status: 'SUBMETIDA',
          instituicaoId: banca.instituicaoId,
        },
        transaction,
      });
      const notasValidas = avaliacoes
        .map((avaliacao) => calcularNotaAvaliacao(avaliacao.notas, criterios))
        .filter((nota) => nota !== null);
      // Cada avaliação é ponderada pelos pesos dos critérios; depois é calculada
      // a média entre avaliações válidas. Arredonda-se somente a pontuação final.
      const media = notasValidas.length
        ? notasValidas.reduce((soma, nota) => soma + nota, 0) / notasValidas.length
        : 0;
      resultados.push({
        bancaId,
        projetoId: bancaProjeto.projetoId,
        nomeProjeto: bancaProjeto.projeto?.nome || '',
        pontuacaoFinal: media,
        quantidadeAvaliacoesValidas: notasValidas.length,
      });
    }

    const classificados = classificarResultados(resultados, casasDecimais, banca.politicaDesempate);
    for (const item of classificados) {
      // quantidadeAvaliacoesValidas é metadado de resposta; não existe como coluna SQL.
      const persistido = {
        bancaId: item.bancaId,
        projetoId: item.projetoId,
        pontuacaoFinal: item.pontuacaoFinal,
        posicao: item.posicao,
      };
      const [registro, criado] = await ResultadoProjeto.findOrCreate({
        where: { bancaId: item.bancaId, projetoId: item.projetoId },
        defaults: { ...persistido, status: 'RASCUNHO' },
        transaction,
      });
      if (!criado && registro.status !== 'PUBLICADO') {
        await registro.update(persistido, { transaction });
      }
    }

    await registrarAuditoria({
      instituicaoId: banca.instituicaoId,
      usuarioId: req.usuario.id,
      operacao: 'CALCULAR_RANKING',
      entidade: 'resultados_projetos',
      entidadeId: bancaId,
      dadosNovos: { quantidadeProjetos: classificados.length, casasDecimais, politicaDesempate: banca.politicaDesempate },
      transaction,
    });
    await transaction.commit();

    return res.json({
      mensagem: 'Ranking calculado. Avaliações incompletas foram excluídas; projetos sem avaliações válidas recebem zero.',
      resultados: classificados,
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Erro ao calcular ranking:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao calcular ranking.' });
  }
};

export const obterRankingBanca = async (req, res) => {
  try {
    const { bancaId } = req.params;
    const banca = await Banca.findByPk(bancaId);
    const podeVerRascunho = ['SUPERADMIN', 'ADMIN_INST', 'COORDENADOR'].includes(req.papelAtivo);
    const where = { bancaId };
    if (banca?.status === 'PUBLICADA' || !podeVerRascunho) where.status = 'PUBLICADO';
    const ranking = await ResultadoProjeto.findAll({ where, include: [{ model: Projeto, as: 'projeto', attributes: ['id', 'nome', 'descricao'] }], order: [['posicao', 'ASC']] });
    return res.json(ranking);
  } catch (error) {
    console.error('Erro ao consultar ranking:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao obter ranking.' });
  }
};

export const publicarRanking = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { bancaId } = req.params;
    const banca = await Banca.findByPk(bancaId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!banca) {
      await transaction.rollback();
      return res.status(404).json({ mensagem: 'Banca não encontrada.' });
    }
    if (banca.status === 'PUBLICADA') {
      await transaction.rollback();
      return res.status(409).json({ mensagem: 'Esta banca já foi publicada.' });
    }
    if (!['EMPATE_COMPARTILHADO', 'NOME_PROJETO'].includes(banca.politicaDesempate)) {
      await transaction.rollback();
      return res.status(409).json({ mensagem: 'Defina uma política suportada de desempate (EMPATE_COMPARTILHADO ou NOME_PROJETO) antes da publicação.' });
    }
    const resultados = await ResultadoProjeto.findAll({ where: { bancaId }, transaction });
    if (!resultados.length) {
      await transaction.rollback();
      return res.status(400).json({ mensagem: 'Calcule o ranking antes de publicá-lo.' });
    }

    await ResultadoProjeto.update(
      { status: 'PUBLICADO', publicadoEm: new Date() },
      { where: { bancaId }, transaction }
    );
    await banca.update({ status: 'PUBLICADA' }, { transaction });
    await registrarAuditoria({
      instituicaoId: banca.instituicaoId,
      usuarioId: req.usuario.id,
      operacao: 'PUBLICAR_RANKING',
      entidade: 'bancas',
      entidadeId: bancaId,
      dadosNovos: { quantidadeResultados: resultados.length, politicaDesempate: banca.politicaDesempate },
      transaction,
    });
    await transaction.commit();
    return res.json({ mensagem: 'Resultados publicados com sucesso.' });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Erro ao publicar ranking:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao publicar resultados.' });
  }
};
