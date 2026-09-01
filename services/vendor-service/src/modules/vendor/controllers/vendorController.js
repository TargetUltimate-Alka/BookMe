const vendorRepo = require('../repository/vendorRepository');

async function createVendor(req, res) {
  try {
    const { userId, businessName, category, description, location } = req.body;

    if (!userId || !businessName || !category) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'userId, businessName, and category are required fields.',
      });
    }

    const existingVendor = await vendorRepo.getVendorByUserId(userId);
    if (existingVendor) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A vendor profile already exists for this userId.',
      });
    }

    const vendor = await vendorRepo.createVendor({
      userId,
      businessName,
      category,
      description,
      location,
    });

    return res.status(201).json(vendor);
  } catch (error) {
    console.error('Error creating vendor:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function getVendorById(req, res) {
  try {
    const { id } = req.params;
    const vendor = await vendorRepo.getVendorById(id);

    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${id} not found.` });
    }

    return res.status(200).json(vendor);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function searchVendors(req, res) {
  try {
    const { category, location, verified, page = 1, limit = 10 } = req.query;

    const result = await vendorRepo.searchVendors({
      category,
      location,
      verified,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error searching vendors:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function updateVendor(req, res) {
  try {
    const { id } = req.params;
    const existing = await vendorRepo.getVendorById(id);

    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${id} not found.` });
    }

    const updated = await vendorRepo.updateVendor(id, req.body);
    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating vendor:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// Internal endpoints
async function updateRating(req, res) {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (rating === undefined || typeof rating !== 'number') {
      return res.status(400).json({ error: 'Bad Request', message: 'Valid rating number is required.' });
    }

    const updated = await vendorRepo.updateRating(id, rating);
    if (!updated) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${id} not found.` });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating vendor rating:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function getVendorSummary(req, res) {
  try {
    const { id } = req.params;
    const summary = await vendorRepo.getVendorSummary(id);

    if (!summary) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${id} not found.` });
    }

    return res.status(200).json(summary);
  } catch (error) {
    console.error('Error fetching vendor summary:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

module.exports = {
  createVendor,
  getVendorById,
  searchVendors,
  updateVendor,
  updateRating,
  getVendorSummary,
};
