const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const servicesController = require('../controllers/servicesController');
const packagesController = require('../controllers/packagesController');
const availabilityController = require('../../availability/controllers/availabilityController');
const { optionalAuth, requireRole } = require('../../../shared/middleware/authMiddleware');

router.use(optionalAuth);

// Categories Endpoint (also accessible under /api/vendors/categories)
router.get('/categories', vendorController.getCategories);

// Current Vendor Profile & Onboarding Routes (FR-ONB-02, FR-ONB-03, FR-ONB-04, FR-ONB-06)
router.post('/onboarding', vendorController.createVendor);
router.get('/me', vendorController.getMyVendorProfile);
router.put('/me', vendorController.updateVendor);
router.patch('/me', vendorController.updateVendor);

// KYC Routes for 'me' or specific ':id'
router.get('/me/kyc/status', vendorController.getKycStatus);
router.post('/me/kyc/digilocker/start', vendorController.startDigiLockerKyc);
router.get('/me/kyc/digilocker/callback', vendorController.completeDigiLockerCallback);
router.post('/me/kyc/digilocker/callback', vendorController.completeDigiLockerCallback);
router.post('/me/kyc/pan/verify', vendorController.verifyPanKyc);
router.post('/me/kyc/bank/penny-drop', vendorController.verifyBankPennyDrop);
router.post('/me/agreement/esign', vendorController.signVendorAgreement);
router.post('/me/submit', vendorController.submitVendorForReview);
router.get('/me/wallet', vendorController.getVendorWallet);
router.post('/me/wallet/topup', vendorController.topupVendorWallet);

// Core Vendor Profile Routes
router.post('/', vendorController.createVendor);
router.get('/', vendorController.searchVendors);
router.get('/:id', vendorController.getVendorById);
router.patch('/:id', vendorController.updateVendor);
router.put('/:id', vendorController.updateVendor);

// Vendor-specific Onboarding, KYC, Agreement, Status History & Verifier Actions
router.get('/:id/kyc/status', vendorController.getKycStatus);
router.post('/:id/kyc/digilocker/start', vendorController.startDigiLockerKyc);
router.get('/:id/kyc/digilocker/callback', vendorController.completeDigiLockerCallback);
router.post('/:id/kyc/digilocker/callback', vendorController.completeDigiLockerCallback);
router.post('/:id/kyc/pan/verify', vendorController.verifyPanKyc);
router.post('/:id/kyc/bank/penny-drop', vendorController.verifyBankPennyDrop);
router.post('/:id/agreement/esign', vendorController.signVendorAgreement);
router.post('/:id/submit', vendorController.submitVendorForReview);
router.get('/:id/status-history', vendorController.getVendorStatusHistory);

// Verifier & Admin RBAC Protected Endpoints (FR-ONB-06, FR-ADM-01, FR-ADM-04)
router.post(
  '/:id/verify',
  requireRole('verifier', 'superAdmin', 'admin'),
  vendorController.verifyVendorOnboarding
);
router.post(
  '/:id/violations',
  requireRole('verifier', 'superAdmin', 'supportAgent', 'admin'),
  vendorController.recordVendorViolation
);

// Vendor Wallet Endpoints (FR-WAL-01..04)
router.get('/:id/wallet', vendorController.getVendorWallet);
router.post('/:id/wallet/topup', vendorController.topupVendorWallet);

// Vendor Services Routes
router.post('/:id/services', servicesController.createService);
router.get('/:id/services', servicesController.getServices);
router.patch('/:id/services/:serviceId', servicesController.updateService);
router.delete('/:id/services/:serviceId', servicesController.deleteService);

// Vendor Packages, Add-ons & Discounts Routes (FR-VEN-03, FR-VEN-04, FR-VEN-05)
router.post('/:id/packages', packagesController.createPackage);
router.get('/:id/packages', packagesController.getPackages);
router.get('/:id/packages/:packageId', packagesController.getPackageById);
router.patch('/:id/packages/:packageId', packagesController.updatePackage);
router.put('/:id/packages/:packageId', packagesController.updatePackage);
router.post('/:id/packages/:packageId/publish', packagesController.publishPackage);
router.delete('/:id/packages/:packageId', packagesController.deletePackage);

router.post('/:id/packages/:packageId/addons', packagesController.addPackageAddon);
router.get('/:id/packages/:packageId/addons', packagesController.listPackageAddons);
router.delete('/:id/packages/:packageId/addons/:addonId', packagesController.removePackageAddon);

router.post('/:id/discounts', packagesController.createDiscount);
router.get('/:id/discounts', packagesController.listDiscounts);
router.delete('/:id/discounts/:discountId', packagesController.removeDiscount);

// Vendor Media Routes (FR-VEN-02)
router.post('/:id/media/presign', vendorController.presignMediaUpload);
router.post('/:id/media', vendorController.registerMedia);
router.get('/:id/media', vendorController.getVendorMedia);
router.delete('/:id/media/:mediaId', vendorController.deleteMedia);

// Vendor Availability & Package Capacity Routes (FR-VEN-06, FR-VEN-07)
router.get('/:id/availability', availabilityController.getAvailability);
router.post('/:id/availability/block', availabilityController.blockDate);
router.delete('/:id/availability/block/:blockId', availabilityController.unblockDate);
router.get('/:id/packages/:packageId/availability', availabilityController.getPackageAvailability);
router.put('/:id/packages/:packageId/availability', availabilityController.setPackageAvailability);
router.post('/:id/packages/:packageId/availability/bulk', availabilityController.bulkSetPackageAvailability);

module.exports = router;
