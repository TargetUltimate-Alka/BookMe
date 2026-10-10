const eventRepository = require('../repository/eventRepository');
const { getSuggestionsForEvent } = require('../constants/suggestions');

class SuggestionService {
  async getSuggestions(eventId, user) {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      const err = new Error(`Event not found: ${eventId}`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (user.role !== 'admin' && event.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    return getSuggestionsForEvent(event.event_type, event.budget, event.guest_count);
  }
}

module.exports = new SuggestionService();
