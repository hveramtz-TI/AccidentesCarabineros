const express = require('express');
const router = express.Router();
const TipoAccidenteController = require('../controllers/TipoAccidenteController');

router.get('/', TipoAccidenteController.getAll);
router.get('/:id', TipoAccidenteController.getOne);

module.exports = router;
