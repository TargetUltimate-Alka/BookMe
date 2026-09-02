const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');

// Availability Routes
router.get('/:id/availability', availabilityController.getAvailability);
router.post('/:id/availability/block', availabilityController.blockDate);
router.delete('/:id/availability/block/:blockId', availabilityController.unblockDate);

module.exports = router;
