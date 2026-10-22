import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  hashSenha: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'hash_senha'
  },
  status: {
    type: DataTypes.ENUM('ATIVO', 'BLOQUEADO'),
    defaultValue: 'ATIVO'
  },
  criadoEm: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'criado_em'
  }
}, {
  tableName: 'usuarios',
  timestamps: false
});

export default Usuario;