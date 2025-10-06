const express = require('express');
const router = express.Router();
const AccidenteController = require('../controllers/AccidenteController');

// Solo rutas GET según la petición del usuario
router.get('/', AccidenteController.getAll);
// Estadísticas adicionales (deben ir antes de la ruta con parámetro)
router.get('/por-ano', AccidenteController.accidentesPorAno);
router.get('/mayor-tipo-por-ano', AccidenteController.getMayorTipoDeAccidentesPorAño);
router.get('/estadisticas-lugares', AccidenteController.getEstadisticasLugares);
// Rutas con parámetros
router.get('/:id', AccidenteController.getOne);

module.exports = router;
