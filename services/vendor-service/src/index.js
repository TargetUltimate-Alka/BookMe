require('dotenv').config();
const express = require('express');
const db = require('./shared/db');
const initDb = require('./shared/initDb');
const vendorRoutes = require('./modules/vendor/routes/vendorRoutes');
const internalRoutes = require('./modules/vendor/routes/internalRoutes');
const vendorController = require('./modules/vendor/controllers/vendorController');
const packagesController = require('./modules/vendor/controllers/packagesController');
const availabilityController = require('./modules/availability/controllers/availabilityController');
const { optionalAuth, requireRole } = require('./shared/middleware/authMiddleware');
const {
  securityHeaders,
  corsMiddleware,
  rateLimitMiddleware,
  idempotencyMiddleware,
} = require('./shared/middleware/securityMiddleware');
const { errorHandler } = require('./shared/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json({ limit: '5mb' }));
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(rateLimitMiddleware());
app.use(idempotencyMiddleware);
app.use(optionalAuth);

// Health Check Endpoints
function healthHandler(req, res) {
  res.status(200).json({
    status: 'UP',
    service: 'vendor-service',
    postgresConnected: db.isPgActive(),
    storageMode: db.isPgActive() ? 'postgresql' : 'in_memory_fallback',
    timestamp: new Date().toISOString(),
  });
}
app.get('/health', healthHandler);
app.get('/api/vendors/health', healthHandler);

// Internal Endpoints for other microservices (event-booking, payment-feedback)
app.use('/internal', internalRoutes);
app.use('/api/internal', internalRoutes);
app.patch('/api/internal/vendors/:id/rating', vendorController.updateRating);
app.get('/api/internal/vendors/:id/summary', vendorController.getVendorSummary);
app.patch('/internal/vendors/:id/rating', vendorController.updateRating);
app.get('/internal/vendors/:id/summary', vendorController.getVendorSummary);

// Top-Level OpenAPI / Gateway Routes (mounted at both / and /api)
const topLevelRouter = express.Router();

// Categories Hierarchy (60 SRS Service Types across 8 Domains)
topLevelRouter.get('/categories', vendorController.getCategories);

// Customer Search & Discovery (FR-SRCH-01..06, FR-VEN-01, FR-VEN-08)
topLevelRouter.get('/search/vendors', vendorController.searchVendors);

// Event-Planner Checklist Matching (FR-PLAN-02, FR-PLAN-03)
topLevelRouter.post('/planner/match-items', vendorController.matchPlannerItems);
topLevelRouter.get('/planner/match-items', vendorController.matchPlannerItems);

// Notify Me When Capacity Opens (FR-SRCH-05, FR-NOT-02)
topLevelRouter.post('/notify-requests', vendorController.createNotifyRequest);
topLevelRouter.get('/notify-requests', vendorController.listNotifyRequests);

// Standalone Package & Addon & Discount Routes (OpenAPI contract paths)
topLevelRouter.post('/packages', packagesController.createPackage);
topLevelRouter.get('/packages/:packageId', packagesController.getPackageById);
topLevelRouter.put('/packages/:packageId', packagesController.updatePackage);
topLevelRouter.patch('/packages/:packageId', packagesController.updatePackage);
topLevelRouter.post('/packages/:packageId/publish', packagesController.publishPackage);
topLevelRouter.delete('/packages/:packageId', packagesController.deletePackage);
topLevelRouter.post('/packages/:packageId/addons', packagesController.addPackageAddon);
topLevelRouter.get('/packages/:packageId/addons', packagesController.listPackageAddons);
topLevelRouter.delete('/packages/:packageId/addons/:addonId', packagesController.removePackageAddon);
topLevelRouter.post('/packages/:packageId/discounts', packagesController.createDiscount);

// Standalone Media Upload & Moderation Routes (FR-VEN-02)
topLevelRouter.post('/media/presign', vendorController.presignMediaUpload);
topLevelRouter.post('/media', vendorController.registerMedia);
topLevelRouter.get('/media/moderation/queue', requireRole('contentModerator', 'verifier', 'superAdmin', 'admin'), vendorController.listModerationQueue);
topLevelRouter.post('/media/:mediaId/moderate', requireRole('contentModerator', 'verifier', 'superAdmin', 'admin'), vendorController.moderateMedia);

// Standalone Package Availability Routes (FR-VEN-06, FR-VEN-07)
topLevelRouter.get('/availability/packages/:packageId', availabilityController.getPackageAvailability);
topLevelRouter.put('/availability/packages/:packageId', availabilityController.setPackageAvailability);
topLevelRouter.post('/availability/packages/:packageId/bulk', availabilityController.bulkSetPackageAvailability);

// Standalone Wallet Routes (FR-WAL-01..04)
topLevelRouter.get('/wallet/:vendorId', vendorController.getVendorWallet);
topLevelRouter.post('/wallet/:vendorId/topup', vendorController.topupVendorWallet);

// Admin Dynamic CONFIG & Audit Logs Routes (SRS §2.3, FR-ADM-01..06, NFR-SEC-06)
topLevelRouter.get(
  '/admin/configs',
  requireRole('superAdmin', 'financeAdmin', 'verifier', 'contentModerator', 'supportAgent', 'admin'),
  vendorController.getAllConfigs
);
topLevelRouter.put(
  '/admin/configs/:key',
  requireRole('superAdmin', 'financeAdmin', 'admin'),
  vendorController.updateConfig
);
topLevelRouter.get(
  '/admin/configs/history',
  requireRole('superAdmin', 'financeAdmin', 'admin'),
  vendorController.getConfigHistory
);
topLevelRouter.get(
  '/admin/audit-logs',
  requireRole('superAdmin', 'verifier', 'financeAdmin', 'admin'),
  vendorController.getAuditLogs
);

app.use('/', topLevelRouter);
app.use('/api', topLevelRouter);

// Public / Protected Vendor Routes
app.use('/api/vendors', vendorRoutes);
app.use('/vendors', vendorRoutes);

// Global Error Handler
app.use(errorHandler);

async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`vendor-service listening on port ${PORT} (storage: ${db.isPgActive() ? 'PostgreSQL' : 'in-memory fallback'})`);
    });
  } catch (error) {
    console.error('Failed to start vendor-service:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
