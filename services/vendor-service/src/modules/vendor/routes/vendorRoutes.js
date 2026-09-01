const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');

// Vendor Profile Routes
router.post('/', vendorController.createVendor);
router.get('/', vendorController.searchVendors);
router.get('/:id', vendorController.getVendorById);
router.patch('/:id', vendorController.updateVendor);

module.exports = router;
