const express = require('express');
const router = express.Router();
const TipoZonaController = require('../controllers/TipoZonaController');

router.get('/', TipoZonaController.getAll);
router.get('/:id', TipoZonaController.getOne);

module.exports = router;
