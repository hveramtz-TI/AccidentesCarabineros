const express = require('express');
const router = express.Router();
const ComunaController = require('../controllers/ComunaController');

router.get('/', ComunaController.getAll);
router.get('/:id', ComunaController.getOne);

module.exports = router;
