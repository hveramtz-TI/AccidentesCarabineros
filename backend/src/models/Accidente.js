const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const Accidente = sequelize.define('Accidente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  mes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  hora: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  comuna_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  region_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  accdt_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  causa_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  muertos: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  graves: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  m_grave: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  leves: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ilesos: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  tipo_zona_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  calleuno: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  calledos: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  frentenumero: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ruta: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ubicacion_km: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'accidentes',
  timestamps: false
});

module.exports = Accidente;
