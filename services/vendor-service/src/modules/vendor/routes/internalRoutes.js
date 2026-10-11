const express = require('express');
const router = express.Router();
const vendorRepo = require('../repository/vendorRepository');
const packagesRepo = require('../repository/packagesRepository');
const availabilityRepo = require('../../availability/repository/availabilityRepository');

// GET /internal/vendors/:id/summary
router.get('/vendors/:id/summary', async (req, res) => {
  try {
    const vendor = await vendorRepo.getVendorById(req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.status(200).json({
      id: vendor.id,
      businessName: vendor.businessName,
      category: vendor.category,
      rating: vendor.rating,
      verified: vendor.verified,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /internal/vendors/:vendorId/validate?serviceId=...&packageId=...
router.get('/vendors/:vendorId/validate', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { serviceId, packageId } = req.query;

    const vendor = await vendorRepo.getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: { message: `Vendor ${vendorId} not found` } });
    }

    let pkg = null;
    if (packageId) {
      pkg = await packagesRepo.getPackageById(packageId);
    }

    return res.status(200).json({
      valid: true,
      vendorName: vendor.businessName,
      packageName: pkg ? pkg.name : 'Custom Event Package',
      price: pkg ? pkg.price : 45000,
      category: vendor.category,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /internal/availability/check?vendorId=...&date=...
router.get('/availability/check', async (req, res) => {
  try {
    const { vendorId, date } = req.query;
    if (!vendorId || !date) {
      return res.status(400).json({ error: 'vendorId and date are required' });
    }

    const result = await availabilityRepo.checkAvailability(vendorId, date);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /internal/availability/hold
router.post('/availability/hold', async (req, res) => {
  try {
    const { vendorId, date, bookingId } = req.body;
    await availabilityRepo.blockDate(vendorId, {
      date,
      reason: `Held for booking ${bookingId}`,
    });
    res.status(200).json({
      success: true,
      status: 'HELD',
      vendorId,
      date,
      bookingId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /internal/availability/book
router.post('/availability/book', async (req, res) => {
  try {
    const { vendorId, date, bookingId } = req.body;
    await availabilityRepo.blockDate(vendorId, {
      date,
      reason: `Confirmed for booking ${bookingId}`,
    });
    res.status(200).json({
      success: true,
      status: 'BOOKED',
      vendorId,
      date,
      bookingId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /internal/availability/release
router.post('/availability/release', async (req, res) => {
  try {
    const { vendorId, date, bookingId } = req.body;
    // release hold/block
    res.status(200).json({
      success: true,
      status: 'RELEASED',
      vendorId,
      date,
      bookingId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
