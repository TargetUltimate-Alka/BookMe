const notifyService = require('../services/notifyService');

class NotifyController {
  async createNotifyRequest(req, res, next) {
    try {
      const customerId = req.user.id;
      const result = await notifyService.createNotifyRequest(customerId, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listNotifyRequests(req, res, next) {
    try {
      const customerId = req.user.id;
      const result = await notifyService.listNotifyRequests(customerId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async cancelNotifyRequest(req, res, next) {
    try {
      const customerId = req.user.id;
      await notifyService.cancelNotifyRequest(req.params.id, customerId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotifyController();
