const Accidente = require('../models/Accidente');
const TipoAccidente = require('../models/TipoAccidente');
const Region = require('../models/Region');
const Comuna = require('../models/Comuna');

// Solo endpoints GET solicitados por el usuario:
exports.getAll = async (req, res) => {
  try {
    // Paginación: limit y offset opcionales
    const DEFAULT_LIMIT = 50;
    const MAX_LIMIT = 1000;
    let limit = parseInt(req.query.limit, 10) || DEFAULT_LIMIT;
    let offset = parseInt(req.query.offset, 10) || 0;

    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    if (limit <= 0) limit = DEFAULT_LIMIT;
    if (offset < 0) offset = 0;

    const [rows, total] = await Promise.all([
      Accidente.findAll({ limit, offset }),
      Accidente.count(),
    ]);

    res.json({ total, limit, offset, rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const accidente = await Accidente.findByPk(req.params.id);
    if (!accidente) return res.status(404).json({ error: 'No encontrado' });
    res.json(accidente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.accidentesPorAno = async (req, res) => { 
  try {
    const resultado = await Accidente.findAll({
      attributes: [
        [Accidente.sequelize.fn('YEAR', Accidente.sequelize.col('fecha')), 'ano'],
        [Accidente.sequelize.fn('COUNT', Accidente.sequelize.col('id')), 'cantidad'],
      ],
      group: ['ano'],
      order: [['ano', 'ASC']],
    });
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMayorTipoDeAccidentesPorAño = async (req, res) => {
  try {
    // Contar accidentes por año y por tipo (accdt_id)
    const counts = await Accidente.findAll({
      attributes: [
        [Accidente.sequelize.fn('YEAR', Accidente.sequelize.col('fecha')), 'ano'],
        'accdt_id',
        [Accidente.sequelize.fn('COUNT', Accidente.sequelize.col('id')), 'cantidad'],
      ],
      group: ['ano', 'accdt_id'],
      raw: true,
    });

    // Determinar para cada año el tipo con mayor cantidad
    const maximaPorAno = {};
    for (const row of counts) {
      const ano = row.ano;
      if (!ano) continue; // omitir filas sin fecha
      const accdt_id = row.accdt_id;
      const cantidad = parseInt(row.cantidad, 10) || 0;

      if (!maximaPorAno[ano] || cantidad > maximaPorAno[ano].cantidad) {
        maximaPorAno[ano] = { accdt_id, cantidad };
      }
    }

    // Obtener nombres de los tipos para los accdt_id seleccionados
    const accdtIds = Object.values(maximaPorAno)
      .map((m) => m.accdt_id)
      .filter((id) => id != null);

    const tiposMap = {};
    if (accdtIds.length > 0) {
      const tipos = await TipoAccidente.findAll({ where: { id: accdtIds } });
      tipos.forEach((t) => {
        tiposMap[t.id] = t.tipo;
      });
    }

    // Construir resultado
    const resultado = Object.keys(maximaPorAno)
      .map((ano) => ({
        ano: parseInt(ano, 10),
        tipo_id: maximaPorAno[ano].accdt_id,
        tipo: tiposMap[maximaPorAno[ano].accdt_id] || null,
        cantidad: maximaPorAno[ano].cantidad,
      }))
      .sort((a, b) => a.ano - b.ano);

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Devuelve varias estadísticas por regiones y comunas
exports.getEstadisticasLugares = async (req, res) => {
  try {
    const sequelize = Accidente.sequelize;

    // Región con más accidentes
    const regionAccidentes = await Accidente.findAll({
      attributes: [
        'region_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['region_id'],
      order: [[sequelize.literal('cantidad'), 'DESC']],
      limit: 1,
      raw: true,
    });

    // Región con más muertes (sumar columna 'muertos')
    const regionMuertes = await Accidente.findAll({
      attributes: [
        'region_id',
        [sequelize.fn('SUM', sequelize.col('muertos')), 'total_muertes']
      ],
      group: ['region_id'],
      order: [[sequelize.literal('total_muertes'), 'DESC']],
      limit: 1,
      raw: true,
    });

    // Comuna con más accidentes
    const comunaAccidentes = await Accidente.findAll({
      attributes: [
        'comuna_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['comuna_id'],
      order: [[sequelize.literal('cantidad'), 'DESC']],
      limit: 1,
      raw: true,
    });

    // Comuna con más muertos
    const comunaMuertes = await Accidente.findAll({
      attributes: [
        'comuna_id',
        [sequelize.fn('SUM', sequelize.col('muertos')), 'total_muertes']
      ],
      group: ['comuna_id'],
      order: [[sequelize.literal('total_muertes'), 'DESC']],
      limit: 1,
      raw: true,
    });

    // Obtener nombres para region_id y comuna_id
    const resultado = {};

    if (regionAccidentes.length > 0 && regionAccidentes[0].region_id != null) {
      const r = await Region.findByPk(regionAccidentes[0].region_id);
      resultado.region_mas_accidentes = {
        region_id: regionAccidentes[0].region_id,
        region: r ? r.nombre : null,
        cantidad: parseInt(regionAccidentes[0].cantidad, 10) || 0,
      };
    } else {
      resultado.region_mas_accidentes = null;
    }

    if (regionMuertes.length > 0 && regionMuertes[0].region_id != null) {
      const r = await Region.findByPk(regionMuertes[0].region_id);
      resultado.region_mas_muertes = {
        region_id: regionMuertes[0].region_id,
        region: r ? r.nombre : null,
        total_muertes: parseInt(regionMuertes[0].total_muertes, 10) || 0,
      };
    } else {
      resultado.region_mas_muertes = null;
    }

    if (comunaAccidentes.length > 0 && comunaAccidentes[0].comuna_id != null) {
      const c = await Comuna.findByPk(comunaAccidentes[0].comuna_id);
      resultado.comuna_mas_accidentes = {
        comuna_id: comunaAccidentes[0].comuna_id,
        comuna: c ? c.nombre : null,
        cantidad: parseInt(comunaAccidentes[0].cantidad, 10) || 0,
      };
    } else {
      resultado.comuna_mas_accidentes = null;
    }

    if (comunaMuertes.length > 0 && comunaMuertes[0].comuna_id != null) {
      const c = await Comuna.findByPk(comunaMuertes[0].comuna_id);
      resultado.comuna_mas_muertes = {
        comuna_id: comunaMuertes[0].comuna_id,
        comuna: c ? c.nombre : null,
        total_muertes: parseInt(comunaMuertes[0].total_muertes, 10) || 0,
      };
    } else {
      resultado.comuna_mas_muertes = null;
    }

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

