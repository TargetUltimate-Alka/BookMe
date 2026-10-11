const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const internalAuth = require('../middleware/internalAuth');

// Service-to-service internal lookup
router.get('/users/:id', internalAuth, (req, res, next) => authController.getInternalUser(req, res, next));

module.exports = router;
