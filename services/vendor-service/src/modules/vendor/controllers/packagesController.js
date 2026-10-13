const packagesRepo = require('../repository/packagesRepository');
const vendorRepo = require('../repository/vendorRepository');

function resolveVendorIdFromRequest(req) {
  return req.params.id || req.params.vendorId || req.body?.vendorId || req.query?.vendorId || req.user?.vendorId;
}

async function createPackage(req, res) {
  try {
    const vendorId = resolveVendorIdFromRequest(req);
    const { name, price, basePricePaise } = req.body;

    if (!name || (price === undefined && basePricePaise === undefined)) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        message: 'name and price (or basePricePaise) are required.',
      });
    }

    if (!vendorId) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        message: 'vendorId is required.',
      });
    }

    const vendor = await vendorRepo.getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${vendorId} not found.` });
    }

    const newPackage = await packagesRepo.createPackage(vendorId, req.body);
    return res.status(201).json(newPackage);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: error.code || (status === 400 ? 'Validation failed' : 'Internal Server Error'),
      code: error.code || 'INTERNAL_ERROR',
      message: error.message,
    });
  }
}

async function getPackages(req, res) {
  try {
    const vendorId = resolveVendorIdFromRequest(req);
    if (!vendorId) {
      return res.status(400).json({ error: 'Validation failed', message: 'vendorId is required.' });
    }

    const vendor = await vendorRepo.getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${vendorId} not found.` });
    }

    const packages = await packagesRepo.getPackagesByVendorId(vendorId, {
      status: req.query.status,
      categoryId: req.query.categoryId,
    });
    return res.status(200).json(packages);
  } catch (error) {
    return res.status(error.status || 500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function getPackageById(req, res) {
  try {
    const { packageId } = req.params;
    const pkg = await packagesRepo.getPackageById(packageId);
    if (!pkg) {
      return res.status(404).json({ error: 'Not Found', message: `Package ${packageId} not found.` });
    }
    return res.status(200).json(pkg);
  } catch (error) {
    return res.status(error.status || 500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function updatePackage(req, res) {
  try {
    const { id: paramVendorId, packageId } = req.params;
    const existing = await packagesRepo.getPackageById(packageId);

    if (!existing || (paramVendorId && existing.vendorId !== paramVendorId)) {
      return res.status(404).json({ error: 'Not Found', message: `Package not found for this vendor.` });
    }

    const updated = await packagesRepo.updatePackage(packageId, existing.vendorId, req.body);
    return res.status(200).json(updated);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: error.code || 'Validation failed',
      code: error.code || 'INTERNAL_ERROR',
      message: error.message,
      mediaEligibility: error.mediaEligibility,
    });
  }
}

async function publishPackage(req, res) {
  try {
    const { id: paramVendorId, packageId } = req.params;
    const existing = await packagesRepo.getPackageById(packageId);
    if (!existing || (paramVendorId && existing.vendorId !== paramVendorId)) {
      return res.status(404).json({ error: 'Not Found', message: 'Package not found.' });
    }

    const published = await packagesRepo.updatePackage(packageId, existing.vendorId, { status: 'PUBLISHED' });
    return res.status(200).json(published);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: error.code || 'Publish check failed',
      code: error.code || 'PUBLISH_MEDIA_REQUIREMENT_UNMET',
      message: error.message,
      mediaEligibility: error.mediaEligibility,
    });
  }
}

async function deletePackage(req, res) {
  try {
    const { id: paramVendorId, packageId } = req.params;
    const existing = await packagesRepo.getPackageById(packageId);
    if (!existing || (paramVendorId && existing.vendorId !== paramVendorId)) {
      return res.status(404).json({ error: 'Not Found', message: `Package not found for this vendor.` });
    }

    const deleted = await packagesRepo.deletePackage(packageId, existing.vendorId);
    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: `Package not found for this vendor.` });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// ============================================================================
// Add-ons Endpoints (FR-VEN-04)
// ============================================================================
async function addPackageAddon(req, res) {
  try {
    const { packageId } = req.params;
    const pkg = await packagesRepo.getPackageById(packageId);
    if (!pkg) {
      return res.status(404).json({ error: 'Not Found', message: `Package ${packageId} not found.` });
    }
    const addon = await packagesRepo.addPackageAddon(pkg.vendorId, packageId, req.body);
    return res.status(201).json(addon);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.code || 'Validation failed',
      message: error.message,
    });
  }
}

async function listPackageAddons(req, res) {
  try {
    const { packageId } = req.params;
    const addons = await packagesRepo.getPackageAddons(packageId);
    return res.status(200).json({ packageId, items: addons });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function removePackageAddon(req, res) {
  try {
    const { packageId, addonId } = req.params;
    const pkg = await packagesRepo.getPackageById(packageId);
    if (!pkg) return res.status(404).json({ error: 'Not Found', message: 'Package not found' });

    const deleted = await packagesRepo.deletePackageAddon(addonId, pkg.vendorId);
    if (!deleted) return res.status(404).json({ error: 'Not Found', message: 'Add-on not found' });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// ============================================================================
// Discounts Endpoints (FR-VEN-05)
// ============================================================================
async function createDiscount(req, res) {
  try {
    const vendorId = resolveVendorIdFromRequest(req) || req.body?.vendorId;
    if (!vendorId && req.params.packageId) {
      const pkg = await packagesRepo.getPackageById(req.params.packageId);
      if (pkg) req.body.vendorId = pkg.vendorId;
    }
    const targetVendorId = vendorId || req.body?.vendorId;
    if (!targetVendorId) {
      return res.status(400).json({ error: 'Validation failed', message: 'vendorId is required' });
    }

    const discount = await packagesRepo.createDiscount(targetVendorId, {
      ...req.body,
      packageId: req.params.packageId || req.body.packageId || null,
    });
    return res.status(201).json(discount);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.code || 'Validation failed',
      message: error.message,
    });
  }
}

async function listDiscounts(req, res) {
  try {
    const vendorId = resolveVendorIdFromRequest(req);
    if (!vendorId) {
      return res.status(400).json({ error: 'Validation failed', message: 'vendorId is required' });
    }
    const discounts = await packagesRepo.getVendorDiscounts(vendorId, {
      packageId: req.query.packageId,
      activeOnly: req.query.activeOnly === 'true',
    });
    return res.status(200).json({ vendorId, items: discounts });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function removeDiscount(req, res) {
  try {
    const vendorId = resolveVendorIdFromRequest(req);
    const { discountId } = req.params;
    const deleted = await packagesRepo.deleteDiscount(discountId, vendorId);
    if (!deleted) return res.status(404).json({ error: 'Not Found', message: 'Discount not found' });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

module.exports = {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  publishPackage,
  deletePackage,
  addPackageAddon,
  listPackageAddons,
  removePackageAddon,
  createDiscount,
  listDiscounts,
  removeDiscount,
};
