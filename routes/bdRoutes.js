const express = require('express');
const bdController = require('../controllers/bdController');

const router = express.Router();

// GET /api/bds/search?q=titre
router.get('/search', bdController.searchBds);

// GET /api/bds/search?q=titre
router.get('/search', bdController.searchBds);

// GET /api/bds/:isbn
router.get('/:isbn', bdController.getBdByIsbn);

module.exports = router;
