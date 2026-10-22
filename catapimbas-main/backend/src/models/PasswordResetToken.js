import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PasswordResetToken = sequelize.define('PasswordResetToken', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  usuarioId: { type: DataTypes.UUID, allowNull: false, field: 'usuario_id' },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'token_hash' },
  expiraEm: { type: DataTypes.DATE, allowNull: false, field: 'expira_em' },
  usadoEm: { type: DataTypes.DATE, allowNull: true, field: 'usado_em' },
  criadoEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'criado_em' },
}, { tableName: 'tokens_redefinicao_senha', timestamps: false });

export default PasswordResetToken;
