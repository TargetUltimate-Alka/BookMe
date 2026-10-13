const coverageService = require('../services/coverageService');

class CoverageController {
  async listMatchingVendorsForItem(req, res, next) {
    try {
      const { id: eventId, itemId } = req.params;
      const result = await coverageService.listMatchingVendorsForItem(eventId, itemId, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getEventCoverageSummary(req, res, next) {
    try {
      const { id: eventId } = req.params;
      const result = await coverageService.getEventCoverageSummary(eventId, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CoverageController();
