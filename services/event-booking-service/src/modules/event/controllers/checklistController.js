const checklistService = require('../services/checklistService');

class ChecklistController {
  async getChecklist(req, res, next) {
    try {
      const result = await checklistService.getChecklist(req.params.id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async createChecklistItem(req, res, next) {
    try {
      const result = await checklistService.addItem(req.params.id, req.user, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateChecklistItem(req, res, next) {
    try {
      const itemId = req.params.itemId || req.params.id;
      const result = await checklistService.updateItem(itemId, req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteChecklistItem(req, res, next) {
    try {
      const itemId = req.params.itemId || req.params.id;
      await checklistService.deleteItem(itemId, req.user);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ChecklistController();
