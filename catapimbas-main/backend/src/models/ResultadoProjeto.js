import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Banca from './Banca.js';
import Projeto from './Projeto.js';

const ResultadoProjeto = sequelize.define('ResultadoProjeto', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  bancaId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'banca_id'
  },
  projetoId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'projeto_id'
  },
  pontuacaoFinal: {
    type: DataTypes.DECIMAL(7, 4),
    allowNull: false,
    field: 'pontuacao_final'
  },
  posicao: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('RASCUNHO', 'PUBLICADO'),
    defaultValue: 'RASCUNHO'
  },
  publicadoEm: {
    type: DataTypes.DATE,
    field: 'publicado_em'
  }
}, {
  tableName: 'resultados_projetos',
  timestamps: false
});

Banca.hasMany(ResultadoProjeto, { foreignKey: 'bancaId', as: 'resultados' });
ResultadoProjeto.belongsTo(Banca, { foreignKey: 'bancaId', as: 'banca' });

Projeto.hasMany(ResultadoProjeto, { foreignKey: 'projetoId', as: 'resultados' });
ResultadoProjeto.belongsTo(Projeto, { foreignKey: 'projetoId', as: 'projeto' });

export default ResultadoProjeto;