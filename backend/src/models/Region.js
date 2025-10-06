const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const Region = sequelize.define('Region', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(255),
    allowNull: false,
  }
}, {
  tableName: 'regiones',
  timestamps: false
});

module.exports = Region;
