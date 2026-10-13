const availabilityRepo = require('../repository/availabilityRepository');
const vendorRepo = require('../../vendor/repository/vendorRepository');
const packagesRepo = require('../../vendor/repository/packagesRepository');

async function getAvailability(req, res) {
  try {
    const { id: vendorId } = req.params;
    const { date, packageId, startDate, endDate, slotName, requiredQty } = req.query;

    const vendor = await vendorRepo.getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${vendorId} not found.` });
    }

    if (packageId) {
      const pkgAvail = await availabilityRepo.getPackageAvailability(packageId, {
        startDate: startDate || date,
        endDate: endDate || date,
        slotName,
      });
      const capacityCheck = (startDate || date)
        ? await availabilityRepo.checkPackageCapacityForRange({
            vendorId,
            packageId,
            startDate: startDate || date,
            endDate: endDate || startDate || date,
            slotName: slotName || 'ALL_DAY',
            requiredQty: requiredQty || 1,
          })
        : null;
      return res.status(200).json({
        vendorId,
        packageId,
        slots: pkgAvail,
        capacityCheck,
      });
    }

    if (!date) {
      const allBlocked = await availabilityRepo.getVendorBlockedDates(vendorId);
      const packages = await packagesRepo.getVendorPackages(vendorId);
      const packageSlots = [];
      for (const p of packages) {
        const rows = await availabilityRepo.getPackageAvailability(p.id, { startDate, endDate, slotName });
        packageSlots.push(...rows.map((r) => ({ ...r, packageName: p.name })));
      }
      return res.status(200).json({
        vendorId,
        blockedDates: allBlocked,
        packageSlots,
      });
    }

    const result = await availabilityRepo.checkAvailability(vendorId, date);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function blockDate(req, res) {
  try {
    const { id: vendorId } = req.params;
    const { date, reason, packageId, slotName, totalUnits, status } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Validation failed', message: 'date (YYYY-MM-DD) is required.' });
    }

    const vendor = await vendorRepo.getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${vendorId} not found.` });
    }

    if (packageId) {
      const slot = await availabilityRepo.setPackageAvailability(vendorId, packageId, {
        date,
        slotName: slotName || 'ALL_DAY',
        totalUnits: totalUnits !== undefined ? totalUnits : 0,
        status: status || 'BLOCKED',
        reason: reason || 'Blocked by vendor',
      });
      return res.status(201).json(slot);
    }

    const blocked = await availabilityRepo.blockDate(vendorId, { date, reason });
    return res.status(201).json(blocked);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.code || 'Internal Server Error', message: error.message });
  }
}

async function unblockDate(req, res) {
  try {
    const { id: vendorId, blockId } = req.params;

    const unblocked = await availabilityRepo.unblockDate(vendorId, blockId);
    if (!unblocked) {
      return res.status(404).json({ error: 'Not Found', message: `Blocked slot with id ${blockId} not found.` });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function getPackageAvailability(req, res) {
  try {
    const { packageId } = req.params;
    const { startDate, endDate, slotName, date, requiredQty } = req.query;
    const pkg = await packagesRepo.getPackageById(packageId);
    if (!pkg) {
      return res.status(404).json({ error: 'Not Found', message: `Package ${packageId} not found.` });
    }

    const slots = await availabilityRepo.getPackageAvailability(packageId, {
      startDate: startDate || date,
      endDate: endDate || date,
      slotName,
    });

    const check = (startDate || date)
      ? await availabilityRepo.checkPackageCapacityForRange({
          vendorId: pkg.vendorId,
          packageId,
          startDate: startDate || date,
          endDate: endDate || startDate || date,
          slotName: slotName || 'ALL_DAY',
          requiredQty: requiredQty || 1,
        })
      : null;

    return res.status(200).json({
      packageId,
      vendorId: pkg.vendorId,
      defaultCapacityUnits: pkg.totalCapacityUnits,
      slots,
      capacityCheck: check,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function setPackageAvailability(req, res) {
  try {
    const { packageId } = req.params;
    const pkg = await packagesRepo.getPackageById(packageId);
    if (!pkg) {
      return res.status(404).json({ error: 'Not Found', message: `Package ${packageId} not found.` });
    }

    const updated = await availabilityRepo.setPackageAvailability(pkg.vendorId, packageId, req.body);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.code || 'Validation failed',
      code: error.code || 'INTERNAL_ERROR',
      message: error.message,
    });
  }
}

async function bulkSetPackageAvailability(req, res) {
  try {
    const { packageId } = req.params;
    const pkg = await packagesRepo.getPackageById(packageId);
    if (!pkg) {
      return res.status(404).json({ error: 'Not Found', message: `Package ${packageId} not found.` });
    }

    const updatedSlots = await availabilityRepo.bulkSetPackageAvailability(pkg.vendorId, packageId, req.body);
    return res.status(200).json({
      packageId,
      vendorId: pkg.vendorId,
      updatedCount: updatedSlots.length,
      slots: updatedSlots,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.code || 'Validation failed',
      code: error.code || 'INTERNAL_ERROR',
      message: error.message,
    });
  }
}

module.exports = {
  getAvailability,
  blockDate,
  unblockDate,
  getPackageAvailability,
  setPackageAvailability,
  bulkSetPackageAvailability,
};
