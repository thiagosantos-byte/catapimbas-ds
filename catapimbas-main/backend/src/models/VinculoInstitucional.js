import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Usuario from './Usuario.js';
import Instituicao from './Instituicao.js';

const VinculoInstitucional = sequelize.define('VinculoInstitucional', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'usuario_id'
  },
  instituicaoId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'instituicao_id'
  },
  papel: {
    type: DataTypes.ENUM('SUPERADMIN', 'ADMIN_INST', 'COORDENADOR', 'ORIENTADOR', 'AVALIADOR', 'ALUNO'),
    allowNull: false
  },
  situacao: {
    type: DataTypes.ENUM('PENDENTE', 'APROVADO', 'RECUSADO', 'REVOGADO'),
    defaultValue: 'PENDENTE'
  },
  justificativaRecusa: {
    type: DataTypes.TEXT,
    field: 'justificativa_recusa'
  },
  decididoPorUsuarioId: {
    type: DataTypes.UUID,
    field: 'decidido_por_usuario_id'
  },
  criadoEm: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'criado_em'
  }
}, {
  tableName: 'vinculos_institucionais',
  timestamps: false
});

Usuario.hasMany(VinculoInstitucional, { foreignKey: 'usuarioId', as: 'vinculos' });
VinculoInstitucional.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

Instituicao.hasMany(VinculoInstitucional, { foreignKey: 'instituicaoId', as: 'vinculos' });
VinculoInstitucional.belongsTo(Instituicao, { foreignKey: 'instituicaoId', as: 'instituicao' });

VinculoInstitucional.belongsTo(Usuario, { foreignKey: 'decididoPorUsuarioId', as: 'decididoPor' });

export default VinculoInstitucional;