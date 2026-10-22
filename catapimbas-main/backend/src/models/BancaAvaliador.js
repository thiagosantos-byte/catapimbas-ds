import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Banca from './Banca.js';
import Usuario from './Usuario.js';

const BancaAvaliador = sequelize.define('BancaAvaliador', {
  bancaId: {
    type: DataTypes.UUID,
    primaryKey: true,
    field: 'banca_id'
  },
  usuarioId: {
    type: DataTypes.UUID,
    primaryKey: true,
    field: 'usuario_id'
  }
}, {
  tableName: 'banca_avaliadores',
  timestamps: false
});

Banca.hasMany(BancaAvaliador, { foreignKey: 'bancaId', as: 'bancaAvaliadores' });
BancaAvaliador.belongsTo(Banca, { foreignKey: 'bancaId', as: 'banca' });

Usuario.hasMany(BancaAvaliador, { foreignKey: 'usuarioId', as: 'avaliadorBancas' });
BancaAvaliador.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

export default BancaAvaliador;