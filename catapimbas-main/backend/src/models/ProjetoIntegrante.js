import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Projeto from './Projeto.js';
import Usuario from './Usuario.js';

const ProjetoIntegrante = sequelize.define('ProjetoIntegrante', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projetoId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'projeto_id'
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'usuario_id'
  },
  funcao: {
    type: DataTypes.ENUM('ALUNO', 'ORIENTADOR'),
    allowNull: false
  }
}, {
  tableName: 'projeto_integrantes',
  timestamps: false
});

// Relacionamentos da Tabela Associativa
Projeto.hasMany(ProjetoIntegrante, { foreignKey: 'projetoId', as: 'integrantes' });
ProjetoIntegrante.belongsTo(Projeto, { foreignKey: 'projetoId', as: 'projeto' });

Usuario.hasMany(ProjetoIntegrante, { foreignKey: 'usuarioId', as: 'projetosIntegrados' });
ProjetoIntegrante.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

export default ProjetoIntegrante;