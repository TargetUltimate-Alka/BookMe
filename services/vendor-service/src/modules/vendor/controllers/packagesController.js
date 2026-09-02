const packagesRepo = require('../repository/packagesRepository');
const vendorRepo = require('../repository/vendorRepository');

async function createPackage(req, res) {
  try {
    const { id: vendorId } = req.params;
    const { name, serviceIds, price } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'name and price are required.',
      });
    }

    const vendor = await vendorRepo.getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${vendorId} not found.` });
    }

    const newPackage = await packagesRepo.createPackage(vendorId, {
      name,
      serviceIds: Array.isArray(serviceIds) ? serviceIds : [],
      price: parseFloat(price),
    });

    return res.status(201).json(newPackage);
  } catch (error) {
    console.error('Error creating package:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function getPackages(req, res) {
  try {
    const { id: vendorId } = req.params;
    const vendor = await vendorRepo.getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${vendorId} not found.` });
    }

    const packages = await packagesRepo.getPackagesByVendorId(vendorId);
    return res.status(200).json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function updatePackage(req, res) {
  try {
    const { id: vendorId, packageId } = req.params;
    const existing = await packagesRepo.getPackageById(packageId);

    if (!existing || existing.vendorId !== vendorId) {
      return res.status(404).json({ error: 'Not Found', message: `Package not found for this vendor.` });
    }

    const updated = await packagesRepo.updatePackage(packageId, vendorId, req.body);
    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating package:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function deletePackage(req, res) {
  try {
    const { id: vendorId, packageId } = req.params;
    const deleted = await packagesRepo.deletePackage(packageId, vendorId);

    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: `Package not found for this vendor.` });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting package:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

module.exports = {
  createPackage,
  getPackages,
  updatePackage,
  deletePackage,
};
