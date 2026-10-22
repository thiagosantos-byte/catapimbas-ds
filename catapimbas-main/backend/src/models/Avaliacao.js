import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Instituicao from './Instituicao.js';
import Banca from './Banca.js';
import Projeto from './Projeto.js';
import Usuario from './Usuario.js';

const Avaliacao = sequelize.define('Avaliacao', {
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
  avaliadorId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'avaliador_id'
  },
  status: {
    type: DataTypes.ENUM('RASCUNHO', 'SUBMETIDA', 'CANCELADA'),
    defaultValue: 'SUBMETIDA'
  },
  notas: {
    type: DataTypes.JSONB, 
    allowNull: false
  },
  submetidaEm: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'submetida_em'
  }
}, {
  tableName: 'avaliacoes',
  timestamps: false
});

Instituicao.hasMany(Avaliacao, { foreignKey: 'instituicaoId', as: 'avaliacoes' });
Avaliacao.belongsTo(Instituicao, { foreignKey: 'instituicaoId', as: 'instituicao' });

Banca.hasMany(Avaliacao, { foreignKey: 'bancaId', as: 'avaliacoes' });
Avaliacao.belongsTo(Banca, { foreignKey: 'bancaId', as: 'banca' });

Projeto.hasMany(Avaliacao, { foreignKey: 'projetoId', as: 'avaliacoes' });
Avaliacao.belongsTo(Projeto, { foreignKey: 'projetoId', as: 'projeto' });

Usuario.hasMany(Avaliacao, { foreignKey: 'avaliadorId', as: 'avaliacoesRealizadas' });
Avaliacao.belongsTo(Usuario, { foreignKey: 'avaliadorId', as: 'avaliador' });

export default Avaliacao;