const eventService = require('../services/eventService');

class EventController {
  async createEvent(req, res, next) {
    try {
      const customerId = req.user.id;
      const result = await eventService.createEvent(customerId, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listEvents(req, res, next) {
    try {
      const customerId = req.user.id;
      const result = await eventService.listEvents(customerId, req.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getEventById(req, res, next) {
    try {
      const result = await eventService.getEventById(req.params.id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateEvent(req, res, next) {
    try {
      const result = await eventService.updateEvent(req.params.id, req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async cancelEvent(req, res, next) {
    try {
      const result = await eventService.cancelEvent(req.params.id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getDashboard(req, res, next) {
    try {
      const result = await eventService.getDashboard(req.params.id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EventController();
