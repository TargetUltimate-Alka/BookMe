const budgetService = require('../services/budgetService');

class BudgetController {
  async getBudget(req, res, next) {
    try {
      const result = await budgetService.getBudget(req.params.id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateBudget(req, res, next) {
    try {
      const result = await budgetService.updateBudget(req.params.id, req.user, req.body.categories);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BudgetController();
