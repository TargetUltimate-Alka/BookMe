const { calculateDefaultBudget, BUDGET_SPLITS } = require('../../src/modules/event/constants/budgetTemplates');
const { generateDefaultChecklist, CHECKLIST_TEMPLATES } = require('../../src/modules/event/constants/checklistTemplates');
const { getSuggestionsForEvent } = require('../../src/modules/event/constants/suggestions');

describe('Event Module - Unit Tests: Templates & Calculations', () => {
  describe('Budget Split Rounding Logic', () => {
    it('exact sum matches total budget for clean numbers', () => {
      const totalBudget = 500000;
      const items = calculateDefaultBudget('Wedding', totalBudget);

      const sum = items.reduce((acc, curr) => acc + curr.planned_amount, 0);
      expect(sum).toBe(totalBudget);
      expect(items[0].category).toBe('Venue & Catering');
      expect(items[0].planned_amount).toBe(250000); // 50%
    });

    it('allocates remainder to the largest category for odd budgets', () => {
      const oddBudget = 100003;
      const items = calculateDefaultBudget('Wedding', oddBudget);

      const sum = items.reduce((acc, curr) => acc + curr.planned_amount, 0);
      expect(sum).toBe(oddBudget);

      // Verify largest category received the remainder
      const baseExpected = Math.floor(oddBudget * 0.5);
      expect(items[0].planned_amount).toBeGreaterThanOrEqual(baseExpected);
    });

    it('falls back to Other for unknown event types', () => {
      const items = calculateDefaultBudget('CustomUnknownType', 200000);
      const sum = items.reduce((acc, curr) => acc + curr.planned_amount, 0);
      expect(sum).toBe(200000);
      expect(items.length).toBe(BUDGET_SPLITS.Other.length);
    });
  });

  describe('Checklist Due-Date Generation Logic', () => {
    it('generates tasks with correct due dates for future event', () => {
      const futureDate = '2027-12-01';
      const items = generateDefaultChecklist('Wedding', futureDate);

      expect(items.length).toBe(CHECKLIST_TEMPLATES.Wedding.length);
      expect(items[0].task).toBe('Book venue and finalize caterer');
      expect(items[0].done).toBe(false);

      // 90 days before 2027-12-01 is 2027-09-02
      expect(items[0].due_date).toBe('2027-09-02');
    });

    it('never assigns a due date earlier than today if event is soon', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 10); // Event in 10 days
      const soonStr = soon.toISOString().split('T')[0];

      const items = generateDefaultChecklist('Wedding', soonStr);
      const todayStr = new Date().toISOString().split('T')[0];

      items.forEach((item) => {
        expect(item.due_date >= todayStr).toBe(true);
      });
    });
  });

  describe('Suggestions Engine', () => {
    it('returns formatted category breakdown and vendor tips', () => {
      const suggestions = getSuggestionsForEvent('Corporate', 300000, 150);

      expect(suggestions.event_type).toBe('Corporate');
      expect(suggestions.budget).toBe(300000);
      expect(suggestions.suggested_categories.length).toBeGreaterThan(0);
      expect(suggestions.vendor_tips.length).toBeGreaterThan(0);

      const venueCat = suggestions.suggested_categories.find(
        (c) => c.category === 'Venue & Audio-Visual'
      );
      expect(venueCat).toBeDefined();
      expect(venueCat.suggested_amount).toBe(135000); // 45% of 300000
    });
  });
});
