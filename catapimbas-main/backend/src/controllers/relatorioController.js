import ExcelJS from 'exceljs';
import Banca from '../models/Banca.js';
import ResultadoProjeto from '../models/ResultadoProjeto.js';
import Projeto from '../models/Projeto.js';
import Avaliacao from '../models/Avaliacao.js';
import Usuario from '../models/Usuario.js';

export const exportarRankingExcel = async (req, res) => {
  try {
    const { bancaId } = req.params;

    const banca = await Banca.findByPk(bancaId);
    if (!banca) {
      return res.status(404).json({ mensagem: 'Banca não encontrada.' });
    }

    const administrador = ['SUPERADMIN', 'ADMIN_INST', 'COORDENADOR'].includes(req.papelAtivo);
    const resultados = await ResultadoProjeto.findAll({
      where: administrador ? { bancaId } : { bancaId, status: 'PUBLICADO' },
      include: [{ model: Projeto, as: 'projeto', attributes: ['nome'] }],
      order: [['posicao', 'ASC']]
    });

    const avaliacoes = administrador ? await Avaliacao.findAll({
      where: { bancaId, status: 'SUBMETIDA', instituicaoId: banca.instituicaoId },
      include: [
        { model: Projeto, as: 'projeto', attributes: ['nome'] },
        { model: Usuario, as: 'avaliador', attributes: ['nome'] }
      ]
    }) : [];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Plataforma de Avaliações';
    workbook.created = new Date();

    const abaRanking = workbook.addWorksheet('Classificação Geral');
    abaRanking.columns = [
      { header: 'Posição', key: 'posicao', width: 12 },
      { header: 'Projeto', key: 'projeto', width: 35 },
      { header: 'Pontuação Final', key: 'pontuacaoFinal', width: 18 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    resultados.forEach(item => {
      abaRanking.addRow({
        posicao: `${item.posicao}º`,
        projeto: item.projeto ? item.projeto.nome : 'N/A',
        pontuacaoFinal: parseFloat(item.pontuacaoFinal),
        status: item.status
      });
    });

    const abaDetalhada = workbook.addWorksheet('Avaliações Detalhadas');
    abaDetalhada.columns = [
      { header: 'Projeto', key: 'projeto', width: 30 },
      { header: 'Avaliador', key: 'avaliador', width: 25 },
      { header: 'Notas / Critérios (JSON)', key: 'notas', width: 50 },
      { header: 'Data da Submissão', key: 'data', width: 22 }
    ];

    avaliacoes.forEach(av => {
      abaDetalhada.addRow({
        projeto: av.projeto ? av.projeto.nome : 'N/A',
        avaliador: av.avaliador ? av.avaliador.nome : 'N/A',
        notas: JSON.stringify(av.notas),
        data: av.submetidaEm
      });
    });

    [abaRanking, abaDetalhada].forEach(aba => {
      aba.getRow(1).font = { bold: true };
    });

    const nomeArquivo = `Relatorio_Banca_${banca.nome.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);

    await workbook.xlsx.write(res);
    return res.end();

  } catch (error) {
    console.error('Erro ao exportar relatório em Excel:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao gerar relatório em Excel.' });
  }
};
