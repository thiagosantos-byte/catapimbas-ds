import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Instituicao = sequelize.define('Instituicao', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  identificador: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('ATIVA', 'SUSPENSA'),
    defaultValue: 'ATIVA'
  },
  corTema: {
    type: DataTypes.STRING(20),
    field: 'cor_tema' // Mapeia camelCase do JS para snake_case do SQL
  },
  logoUrl: {
    type: DataTypes.TEXT,
    field: 'logo_url'
  },
  criadoEm: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'criado_em'
  }
}, {
  tableName: 'instituicoes',
  timestamps: false
});

export default Instituicao;

