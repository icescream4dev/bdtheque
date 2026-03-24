const express = require('express');
const bdController = require('../controllers/bdController');

const router = express.Router();

// GET /api/bds/:isbn
router.get('/:isbn', bdController.getBdByIsbn);

module.exports = router;
