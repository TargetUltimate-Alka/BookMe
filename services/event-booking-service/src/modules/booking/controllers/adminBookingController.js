const adminBookingService = require('../services/adminBookingService');

class AdminBookingController {
  async listAllBookings(req, res, next) {
    try {
      const result = await adminBookingService.listAllBookings(req.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getAdminBookingDetails(req, res, next) {
    try {
      const result = await adminBookingService.getAdminBookingDetails(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getStats(req, res, next) {
    try {
      const result = await adminBookingService.getStats();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminBookingController();
