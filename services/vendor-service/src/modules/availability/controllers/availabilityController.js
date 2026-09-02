const availabilityRepo = require('../repository/availabilityRepository');
const vendorRepo = require('../../vendor/repository/vendorRepository');

async function getAvailability(req, res) {
  try {
    const { id: vendorId } = req.params;
    const { date } = req.query;

    const vendor = await vendorRepo.getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${vendorId} not found.` });
    }

    if (!date) {
      // Return all blocked dates if no specific date is provided
      const allBlocked = await availabilityRepo.getVendorBlockedDates(vendorId);
      return res.status(200).json({ vendorId, blockedDates: allBlocked });
    }

    const result = await availabilityRepo.checkAvailability(vendorId, date);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error checking availability:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function blockDate(req, res) {
  try {
    const { id: vendorId } = req.params;
    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Validation failed', message: 'date (YYYY-MM-DD) is required.' });
    }

    const vendor = await vendorRepo.getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${vendorId} not found.` });
    }

    const blocked = await availabilityRepo.blockDate(vendorId, { date, reason });
    return res.status(201).json(blocked);
  } catch (error) {
    console.error('Error blocking date:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
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
    console.error('Error unblocking date:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

module.exports = {
  getAvailability,
  blockDate,
  unblockDate,
};
