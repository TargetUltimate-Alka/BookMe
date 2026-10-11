const budgetRepository = require('../repository/budgetRepository');
const eventRepository = require('../repository/eventRepository');

class BudgetService {
  async getBudget(eventId, user) {
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

    const categories = await budgetRepository.findByEventId(eventId);

    let plannedTotal = 0;
    let actualTotal = 0;

    const formattedCategories = categories.map((cat) => {
      const planned = Number(cat.planned_amount);
      const actual = Number(cat.actual_amount);
      plannedTotal += planned;
      actualTotal += actual;

      return {
        id: cat.id,
        category: cat.category,
        planned_amount: planned,
        actual_amount: actual,
        remaining: Math.max(0, planned - actual),
      };
    });

    const totalBudget = Number(event.budget);
    const remaining = Math.max(0, totalBudget - actualTotal);
    const overBudget = actualTotal > totalBudget;

    return {
      totalBudget,
      plannedTotal,
      actualTotal,
      remaining,
      overBudget,
      categories: formattedCategories,
    };
  }

  async updateBudget(eventId, user, categoriesToUpdate) {
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

    await budgetRepository.upsertCategories(eventId, categoriesToUpdate);

    // Refresh budget summary
    const summary = await this.getBudget(eventId, user);

    // Warn if planned exceeds budget × 1.0 (SRS §3.4 rule)
    const plannedExceedsBudget = summary.plannedTotal > summary.totalBudget;

    return {
      ...summary,
      plannedExceedsBudget,
    };
  }
}

module.exports = new BudgetService();
