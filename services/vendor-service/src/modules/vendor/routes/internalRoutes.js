const express = require('express');
const router = express.Router();
const vendorRepo = require('../repository/vendorRepository');
const packagesRepo = require('../repository/packagesRepository');
const availabilityRepo = require('../../availability/repository/availabilityRepository');
const {
  createImmutablePriceSnapshot,
  calculateDistanceKm,
} = require('../../../shared/utils/moneyAndTime');

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
      kycStatus: vendor.kycStatus,
      serviceRadiusKm: vendor.serviceRadiusKm,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /internal/vendors/:vendorId/validate?serviceId=...&packageId=...&venueLat=...&venueLng=...&quantity=...&promoCode=...
// Also supports POST /internal/vendors/:vendorId/price-snapshot for immutable booking snapshot (FR-VEN-10)
async function handleValidateAndSnapshot(req, res) {
  try {
    const { vendorId } = req.params;
    const params = { ...req.query, ...req.body };
    const {
      packageId,
      quantity = 1,
      selectedAddons = [],
      promoCode,
      venueLat,
      venueLng,
      venueLocation,
    } = params;

    const vendor = await vendorRepo.getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: { message: `Vendor ${vendorId} not found` } });
    }

    if (!vendor.verified || vendor.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        valid: false,
        code: 'VENDOR_NOT_APPROVED',
        error: { message: `Vendor ${vendorId} is not approved for live bookings (status: ${vendor.kycStatus})` },
      });
    }

    // Service radius / area check (FR-VEN-08)
    if (venueLat !== undefined && venueLng !== undefined && vendor.latitude !== null && vendor.longitude !== null) {
      const distKm = calculateDistanceKm(Number(venueLat), Number(venueLng), vendor.latitude, vendor.longitude);
      const explicitMatch =
        venueLocation &&
        (vendor.serviceAreas || []).some((a) => String(a).toLowerCase().includes(String(venueLocation).toLowerCase()));

      if (!explicitMatch && distKm !== null && distKm > Number(vendor.serviceRadiusKm || 50)) {
        return res.status(422).json({
          valid: false,
          code: 'OUTSIDE_SERVICE_RADIUS',
          distanceKm: distKm,
          serviceRadiusKm: vendor.serviceRadiusKm,
          error: {
            message: `Customer venue is ${distKm} km away, exceeding vendor service radius of ${vendor.serviceRadiusKm} km (FR-VEN-08)`,
          },
        });
      }
    }

    let pkg = null;
    if (packageId) {
      pkg = await packagesRepo.getPackageById(packageId);
    } else {
      const vendorPkgs = await packagesRepo.getVendorPackages(vendorId);
      pkg = vendorPkgs[0] || null;
    }

    const activeDiscounts = await packagesRepo.getVendorDiscounts(vendorId, { activeOnly: true });
    let matchingDiscount = null;
    if (promoCode) {
      matchingDiscount = activeDiscounts.find(
        (d) => d.promoCode && d.promoCode.toUpperCase() === String(promoCode).toUpperCase() && (!d.packageId || (pkg && d.packageId === pkg.id))
      );
    } else if (pkg) {
      matchingDiscount = activeDiscounts.find((d) => !d.packageId || d.packageId === pkg.id);
    }

    // Resolve add-ons
    let resolvedAddons = [];
    if (pkg && Array.isArray(selectedAddons) && selectedAddons.length > 0) {
      const pkgAddons = pkg.addons || [];
      for (const item of selectedAddons) {
        const addonId = typeof item === 'string' ? item : item.addonId || item.id;
        const found = pkgAddons.find((a) => a.id === addonId);
        if (found) {
          resolvedAddons.push({
            ...found,
            quantity: Number(item.quantity || 1),
          });
        }
      }
    }

    const fallbackPkg = pkg || {
      id: packageId || `pkg_custom_${vendorId}`,
      vendorId,
      name: 'Custom Event Package',
      tier: 'Standard',
      priceUnit: 'PER_DAY',
      basePricePaise: 4500000,
      securityDepositPaise: 0,
      gstRateBps: 1800,
      hsnSacCode: '998596',
      taxInclusive: false,
      cancellationPolicy: 'MODERATE',
      inclusions: [],
      exclusions: [],
    };

    const immutableSnapshot = createImmutablePriceSnapshot({
      pkg: fallbackPkg,
      quantity: Number(quantity || 1),
      selectedAddons: resolvedAddons,
      discount: matchingDiscount,
    });

    return res.status(200).json({
      valid: true,
      vendorId: vendor.id,
      vendorName: vendor.businessName,
      packageName: fallbackPkg.name,
      price: immutableSnapshot.totalPayableInr,
      basePriceInr: fallbackPkg.basePricePaise / 100,
      totalPayablePaise: immutableSnapshot.totalPayablePaise,
      category: vendor.category,
      priceSnapshot: immutableSnapshot,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.get('/vendors/:vendorId/validate', handleValidateAndSnapshot);
router.post('/vendors/:vendorId/price-snapshot', handleValidateAndSnapshot);

// GET /internal/availability/check?vendorId=...&date=...&packageId=...&slotName=...&quantity=...
router.get('/availability/check', async (req, res) => {
  try {
    const { vendorId, date, packageId, slotName, quantity } = req.query;
    if (!vendorId || !date) {
      return res.status(400).json({ error: 'vendorId and date are required' });
    }

    if (packageId) {
      const capResult = await availabilityRepo.checkPackageCapacityForRange({
        vendorId,
        packageId,
        startDate: date,
        endDate: date,
        slotName: slotName || 'ALL_DAY',
        requiredQty: Number(quantity || 1),
      });
      return res.status(200).json({
        date,
        available: capResult.available,
        capacity: capResult,
      });
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
    const { vendorId, packageId, date, slotName = 'ALL_DAY', quantity = 1, bookingId } = req.body;
    if (!vendorId || !date) {
      return res.status(400).json({ error: 'vendorId and date are required' });
    }

    const held = await availabilityRepo.holdCapacity({
      vendorId,
      packageId,
      bookingId,
      date,
      slotName,
      quantity,
    });

    res.status(200).json({
      success: true,
      status: 'HELD',
      vendorId,
      packageId: held.packageId,
      date: held.date,
      slotName: held.slotName,
      quantity: held.quantity,
      bookingId,
      reservationId: held.reservationId,
      expiresAt: held.expiresAt,
      availability: held.availability,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      code: err.code || 'HOLD_FAILED',
      error: err.message,
    });
  }
});

// POST /internal/availability/book
router.post('/availability/book', async (req, res) => {
  try {
    const { reservationId, vendorId, packageId, date, slotName = 'ALL_DAY', quantity = 1, bookingId } = req.body;
    const booked = await availabilityRepo.bookCapacity({
      reservationId,
      bookingId,
      vendorId,
      packageId,
      date,
      slotName,
      quantity,
    });

    res.status(200).json({
      success: true,
      status: 'BOOKED',
      vendorId: booked.vendorId,
      packageId: booked.packageId,
      date: booked.date,
      slotName: booked.slotName,
      quantity: booked.quantity,
      bookingId,
      reservationId: booked.reservationId,
      availability: booked.availability,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      code: err.code || 'BOOK_FAILED',
      error: err.message,
    });
  }
});

// POST /internal/availability/release
router.post('/availability/release', async (req, res) => {
  try {
    const { reservationId, vendorId, packageId, date, slotName = 'ALL_DAY', quantity = 1, bookingId } = req.body;
    const released = await availabilityRepo.releaseCapacity({
      reservationId,
      bookingId,
      vendorId,
      packageId,
      date,
      slotName,
      quantity,
    });

    res.status(200).json({
      success: true,
      status: 'RELEASED',
      vendorId: released.vendorId,
      packageId: released.packageId,
      date: released.date,
      bookingId,
      availability: released.availability,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
