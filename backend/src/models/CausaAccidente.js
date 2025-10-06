const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const CausaAccidente = sequelize.define('CausaAccidente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  causa: {
    type: DataTypes.STRING(255),
    allowNull: false,
  }
}, {
  tableName: 'causas_accidente',
  timestamps: false
});

module.exports = CausaAccidente;
