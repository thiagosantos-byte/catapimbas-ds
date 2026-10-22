import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Instituicao from './Instituicao.js';

const Banca = sequelize.define('Banca', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  instituicaoId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'instituicao_id'
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  periodoInicio: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'periodo_inicio'
  },
  periodoFim: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'periodo_fim'
  },
  status: {
    type: DataTypes.ENUM('PLANEJADA', 'ABERTA', 'EM_AVALIACAO', 'CONCLUIDA', 'PUBLICADA'),
    defaultValue: 'PLANEJADA'
  },
  politicaDesempate: {
    type: DataTypes.STRING(40),
    allowNull: false,
    validate: { isIn: [['EMPATE_COMPARTILHADO', 'NOME_PROJETO']] },
    field: 'politica_desempate'
  },
  regraNotasAusentes: {
    type: DataTypes.TEXT,
    field: 'regra_notas_ausentes'
  },
  casasDecimais: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
    field: 'casas_decimais'
  },
  criadoEm: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'criado_em'
  }
}, {
  tableName: 'bancas',
  timestamps: false
});

Instituicao.hasMany(Banca, { foreignKey: 'instituicaoId', as: 'bancas' });
Banca.belongsTo(Instituicao, { foreignKey: 'instituicaoId', as: 'instituicao' });

export default Banca;