import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Banca from './Banca.js';

const BancaCriterio = sequelize.define('BancaCriterio', {
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
  titulo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descricao: {
    type: DataTypes.TEXT
  },
  peso: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  notaMinima: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'nota_minima'
  },
  notaMaxima: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    field: 'nota_maxima'
  },
  rubricas: {
    type: DataTypes.JSONB 
  }
}, {
  tableName: 'banca_criterios',
  timestamps: false
});

Banca.hasMany(BancaCriterio, { foreignKey: 'bancaId', as: 'criterios' });
BancaCriterio.belongsTo(Banca, { foreignKey: 'bancaId', as: 'banca' });

export default BancaCriterio;