const CausaAccidente = require('../models/CausaAccidente');

exports.getAll = async (req, res) => {
  try {
    const items = await CausaAccidente.findAll();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const item = await CausaAccidente.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};