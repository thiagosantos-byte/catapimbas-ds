import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Instituicao from './Instituicao.js';

const Projeto = sequelize.define('Projeto', {
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
  descricao: {
    type: DataTypes.TEXT
  },
  ano: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  semestre: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isIn: [[1, 2]]
    }
  },
  status: {
    type: DataTypes.ENUM('RASCUNHO', 'SUBMETIDO', 'APROVADO', 'ARQUIVADO'),
    defaultValue: 'RASCUNHO'
  },
  criadoEm: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'criado_em'
  }
}, {
  tableName: 'projetos',
  timestamps: false
});

// Relacionamento com Instituicao
Instituicao.hasMany(Projeto, { foreignKey: 'instituicaoId', as: 'projetos' });
Projeto.belongsTo(Instituicao, { foreignKey: 'instituicaoId', as: 'instituicao' });

export default Projeto;