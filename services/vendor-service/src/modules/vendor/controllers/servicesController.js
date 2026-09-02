const servicesRepo = require('../repository/servicesRepository');
const vendorRepo = require('../repository/vendorRepository');

async function createService(req, res) {
  try {
    const { id: vendorId } = req.params;
    const { title, description, basePrice } = req.body;

    if (!title || basePrice === undefined) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'title and basePrice are required.',
      });
    }

    const vendor = await vendorRepo.getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${vendorId} not found.` });
    }

    const newService = await servicesRepo.createService(vendorId, {
      title,
      description,
      basePrice: parseFloat(basePrice),
    });

    return res.status(201).json(newService);
  } catch (error) {
    console.error('Error creating service:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function getServices(req, res) {
  try {
    const { id: vendorId } = req.params;
    const vendor = await vendorRepo.getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${vendorId} not found.` });
    }

    const services = await servicesRepo.getServicesByVendorId(vendorId);
    return res.status(200).json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function updateService(req, res) {
  try {
    const { id: vendorId, serviceId } = req.params;
    const existing = await servicesRepo.getServiceById(serviceId);

    if (!existing || existing.vendorId !== vendorId) {
      return res.status(404).json({ error: 'Not Found', message: `Service not found for this vendor.` });
    }

    const updated = await servicesRepo.updateService(serviceId, vendorId, req.body);
    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating service:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function deleteService(req, res) {
  try {
    const { id: vendorId, serviceId } = req.params;
    const deleted = await servicesRepo.deleteService(serviceId, vendorId);

    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: `Service not found for this vendor.` });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting service:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

module.exports = {
  createService,
  getServices,
  updateService,
  deleteService,
};
