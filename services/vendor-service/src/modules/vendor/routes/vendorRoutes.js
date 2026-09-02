const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const servicesController = require('../controllers/servicesController');
const packagesController = require('../controllers/packagesController');

// Vendor Profile Routes
router.post('/', vendorController.createVendor);
router.get('/', vendorController.searchVendors);
router.get('/:id', vendorController.getVendorById);
router.patch('/:id', vendorController.updateVendor);

// Vendor Services Routes
router.post('/:id/services', servicesController.createService);
router.get('/:id/services', servicesController.getServices);
router.patch('/:id/services/:serviceId', servicesController.updateService);
router.delete('/:id/services/:serviceId', servicesController.deleteService);

// Vendor Packages Routes
router.post('/:id/packages', packagesController.createPackage);
router.get('/:id/packages', packagesController.getPackages);
router.patch('/:id/packages/:packageId', packagesController.updatePackage);
router.delete('/:id/packages/:packageId', packagesController.deletePackage);

module.exports = router;
