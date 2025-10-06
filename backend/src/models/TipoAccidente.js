const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const TipoAccidente = sequelize.define('TipoAccidente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tipo: {
    type: DataTypes.STRING(100),
    allowNull: false,
  }
}, {
  tableName: 'tipos_accidentes',
  timestamps: false
});

module.exports = TipoAccidente;
