const TipoAccidente = require('../models/TipoAccidente');

exports.getAll = async (req, res) => {
  try {
    const items = await TipoAccidente.findAll();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const item = await TipoAccidente.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
