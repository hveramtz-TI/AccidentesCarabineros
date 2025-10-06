const express = require('express');
const router = express.Router();
const CausaController = require('../controllers/CausaAccidenteController');

router.get('/', CausaController.getAll);
router.get('/:id', CausaController.getOne);

module.exports = router;
