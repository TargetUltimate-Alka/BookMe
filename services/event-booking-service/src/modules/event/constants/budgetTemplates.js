/**
 * Default budget allocation split percentages per event type (SRS §5.9)
 */
const BUDGET_SPLITS = {
  Wedding: [
    { category: 'Venue & Catering', percentage: 50 },
    { category: 'Photography & Video', percentage: 15 },
    { category: 'Decoration & Floral', percentage: 15 },
    { category: 'Music & Entertainment', percentage: 10 },
    { category: 'Makeup & Styling', percentage: 5 },
    { category: 'Miscellaneous', percentage: 5 },
  ],
  Corporate: [
    { category: 'Venue & Audio-Visual', percentage: 45 },
    { category: 'Catering & Refreshments', percentage: 35 },
    { category: 'Event Production & Branding', percentage: 10 },
    { category: 'Photography & Recording', percentage: 5 },
    { category: 'Miscellaneous', percentage: 5 },
  ],
  Birthday: [
    { category: 'Venue & Catering', percentage: 45 },
    { category: 'Decoration & Theme', percentage: 20 },
    { category: 'Photography', percentage: 15 },
    { category: 'Entertainment & Cake', percentage: 15 },
    { category: 'Miscellaneous', percentage: 5 },
  ],
  Anniversary: [
    { category: 'Venue & Catering', percentage: 45 },
    { category: 'Decoration & Theme', percentage: 20 },
    { category: 'Photography & Video', percentage: 20 },
    { category: 'Music & Entertainment', percentage: 10 },
    { category: 'Miscellaneous', percentage: 5 },
  ],
  Social: [
    { category: 'Venue & Catering', percentage: 50 },
    { category: 'Decoration & Setup', percentage: 20 },
    { category: 'Photography', percentage: 15 },
    { category: 'Music & Entertainment', percentage: 10 },
    { category: 'Miscellaneous', percentage: 5 },
  ],
  Other: [
    { category: 'Venue & Catering', percentage: 50 },
    { category: 'Decoration & Setup', percentage: 20 },
    { category: 'Photography', percentage: 15 },
    { category: 'Music & Entertainment', percentage: 10 },
    { category: 'Miscellaneous', percentage: 5 },
  ],
};

/**
 * Calculates default planned budget amounts for an event.
 * Ensures the sum of planned amounts exactly equals totalBudget by adding remainder to the largest category.
 * @param {string} eventType
 * @param {number} totalBudget
 * @returns {Array<{ category: string, planned_amount: number, actual_amount: number }>}
 */
function calculateDefaultBudget(eventType, totalBudget) {
  const budget = Number(totalBudget);
  const splits = BUDGET_SPLITS[eventType] || BUDGET_SPLITS.Other;

  let allocated = 0;
  const items = splits.map((split) => {
    const planned = Math.floor(budget * (split.percentage / 100));
    allocated += planned;
    return {
      category: split.category,
      percentage: split.percentage,
      planned_amount: planned,
      actual_amount: 0.0,
    };
  });

  // Remainder added to the largest category (first item in the split list)
  const remainder = budget - allocated;
  if (remainder > 0 && items.length > 0) {
    items[0].planned_amount += remainder;
  }

  return items;
}

module.exports = {
  BUDGET_SPLITS,
  calculateDefaultBudget,
};
