import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Usuario from './Usuario.js';
import Instituicao from './Instituicao.js';

const Auditoria = sequelize.define('Auditoria', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  instituicaoId: { type: DataTypes.UUID, allowNull: true, field: 'instituicao_id' },
  usuarioId: { type: DataTypes.UUID, allowNull: true, field: 'usuario_id' },
  operacao: { type: DataTypes.STRING(50), allowNull: false },
  entidade: { type: DataTypes.STRING(50), allowNull: false },
  entidadeId: { type: DataTypes.STRING(255), field: 'entidade_id' },
  dadosAnteriores: { type: DataTypes.JSONB, field: 'dados_anteriores' },
  dadosNovos: { type: DataTypes.JSONB, field: 'dados_novos' },
  criadoEm: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'criado_em' }
}, { tableName: 'auditoria', timestamps: false });

Usuario.hasMany(Auditoria, { foreignKey: 'usuarioId', as: 'auditorias' });
Auditoria.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
Instituicao.hasMany(Auditoria, { foreignKey: 'instituicaoId', as: 'auditorias' });
Auditoria.belongsTo(Instituicao, { foreignKey: 'instituicaoId', as: 'instituicao' });
export default Auditoria;
