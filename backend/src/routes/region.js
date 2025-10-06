const express = require('express');
const router = express.Router();
const RegionController = require('../controllers/RegionController');

router.get('/', RegionController.getAll);
router.get('/:id', RegionController.getOne);

module.exports = router;
