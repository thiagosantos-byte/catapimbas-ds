import sequelize from '../config/database.js';
import Projeto from '../models/Projeto.js';
import Banca from '../models/Banca.js';
import Avaliacao from '../models/Avaliacao.js';
import VinculoInstitucional from '../models/VinculoInstitucional.js';

export const obterMetricasDashboard = async (req, res) => {
  try {
    const { instituicaoId } = req.params;
    const podeGerirVinculos = ['SUPERADMIN', 'ADMIN_INST'].includes(req.papelAtivo);

    const [
      totalProjetos,
      totalBancas,
      bancasEmAndamento,
      totalAvaliacoes,
      totalMembrosAprovados,
      vinculosPendentes,
      projetosRecentes,
      projetosPorStatus,
      projetosPorPeriodo,
    ] = await Promise.all([
      Projeto.count({ where: { instituicaoId } }),
      Banca.count({ where: { instituicaoId } }),
      Banca.count({ where: { instituicaoId, status: ['ABERTA', 'EM_AVALIACAO'] } }),
      Avaliacao.count({ where: { instituicaoId, status: 'SUBMETIDA' } }),
      podeGerirVinculos
        ? VinculoInstitucional.count({ where: { instituicaoId, situacao: 'APROVADO' } })
        : Promise.resolve(null),
      podeGerirVinculos
        ? VinculoInstitucional.count({ where: { instituicaoId, situacao: 'PENDENTE' } })
        : Promise.resolve(null),
      Projeto.findAll({
        where: { instituicaoId },
        attributes: ['id', 'nome', 'status', 'ano', 'semestre'],
        order: [['criadoEm', 'DESC']],
        limit: 5,
      }),
      Projeto.findAll({
        where: { instituicaoId },
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        group: ['status'],
        raw: true,
      }),
      Projeto.findAll({
        where: { instituicaoId },
        attributes: ['ano', 'semestre', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        group: ['ano', 'semestre'],
        order: [['ano', 'ASC'], ['semestre', 'ASC']],
        raw: true,
      }),
    ]);

    return res.json({
      resumo: {
        totalProjetos,
        totalBancas,
        bancasEmAndamento,
        totalAvaliacoes,
        totalMembrosAprovados,
        vinculosPendentes,
      },
      projetosRecentes,
      projetosPorStatus: projetosPorStatus.map((item) => ({ status: item.status, total: Number(item.total) })),
      projetosPorPeriodo: projetosPorPeriodo.map((item) => ({ periodo: `${item.ano}-${item.semestre}`, total: Number(item.total) })),
    });
  } catch (error) {
    console.error('Erro ao gerar métricas do dashboard:', error.name);
    return res.status(500).json({ mensagem: 'Erro interno ao carregar métricas do dashboard.' });
  }
};
