const crypto = require('crypto');
const eventService = require('../services/eventService');

function generateEtag(data) {
  return `W/"${crypto.createHash('md5').update(JSON.stringify(data)).digest('hex').substring(0, 16)}"`;
}

class EventController {
  async createEvent(req, res, next) {
    try {
      const customerId = req.user.id;
      const result = await eventService.createEvent(customerId, req.body);
      res.setHeader('Location', `/events/${result.id}`);
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
      const etag = generateEtag(result);
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'private, max-age=60');

      if (req.header('If-None-Match') === etag) {
        return res.status(304).end();
      }

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateEvent(req, res, next) {
    try {
      // Check conditional write (C2: 412 Precondition Failed)
      const ifMatch = req.header('If-Match');
      if (ifMatch) {
        const current = await eventService.getEventById(req.params.id, req.user);
        const currentEtag = generateEtag(current);
        if (ifMatch !== currentEtag && ifMatch !== '*') {
          const err = new Error('Precondition Failed: Resource representation has changed');
          err.status = 412;
          err.code = 'PRECONDITION_FAILED';
          return next(err);
        }
      }

      const result = await eventService.updateEvent(req.params.id, req.user, req.body);
      const updatedEtag = generateEtag(result);
      res.setHeader('ETag', updatedEtag);
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
