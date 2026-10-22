import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Banca from './Banca.js';
import Projeto from './Projeto.js';

const BancaProjeto = sequelize.define('BancaProjeto', {
  bancaId: {
    type: DataTypes.UUID,
    primaryKey: true,
    field: 'banca_id'
  },
  projetoId: {
    type: DataTypes.UUID,
    primaryKey: true,
    field: 'projeto_id'
  },
  elegivelRanking: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'elegivel_ranking'
  }
}, {
  tableName: 'banca_projetos',
  timestamps: false
});

Banca.hasMany(BancaProjeto, { foreignKey: 'bancaId', as: 'bancaProjetos' });
BancaProjeto.belongsTo(Banca, { foreignKey: 'bancaId', as: 'banca' });

Projeto.hasMany(BancaProjeto, { foreignKey: 'projetoId', as: 'projetoBancas' });
BancaProjeto.belongsTo(Projeto, { foreignKey: 'projetoId', as: 'projeto' });

export default BancaProjeto;