const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const Comuna = sequelize.define('Comuna', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  region_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  tableName: 'comunas',
  timestamps: false
});

module.exports = Comuna;
