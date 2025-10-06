const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const TipoZona = sequelize.define('TipoZona', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(20),
    allowNull: false,
  }
}, {
  tableName: 'tipo_zona',
  timestamps: false
});

module.exports = TipoZona;
