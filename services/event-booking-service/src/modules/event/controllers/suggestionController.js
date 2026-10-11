const suggestionService = require('../services/suggestionService');

class SuggestionController {
  async getSuggestions(req, res, next) {
    try {
      const result = await suggestionService.getSuggestions(req.params.id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SuggestionController();
