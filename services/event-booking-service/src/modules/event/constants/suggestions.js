const { BUDGET_SPLITS } = require('./budgetTemplates');

const EVENT_TIPS = {
  Wedding: [
    'Book venue at least 4 to 6 months in advance for peak wedding seasons.',
    'Schedule catering tastings early and confirm vegetarian and special dietary options.',
    'Hire your photographer and videographer together for consistent color grading and better package pricing.',
    'Keep 5% of your budget unallocated for unexpected last-minute requirements.',
  ],
  Corporate: [
    'Ensure venue high-speed Wi-Fi and audio-visual capability meets your attendance capacity.',
    'Confirm presentation recording and microphone requirements at least 2 weeks ahead.',
    'Plan dedicated networking breaks with standing cocktail-style finger foods.',
  ],
  Birthday: [
    'Select a central location accessible to all invited guests.',
    'Order cake delivery at least 2 hours before the event start time.',
    'Include interactive entertainment or photo-booths for memorable guest souvenirs.',
  ],
  Anniversary: [
    'Reserve intimate lighting and private acoustic music for warm celebration atmosphere.',
    'Prepare customized photo slideshows or memory boards in advance.',
  ],
  Social: [
    'Confirm RSVP count 5 days before the event to minimize catering waste.',
    'Have a backup indoor arrangement if organizing an outdoor party.',
  ],
};

function getSuggestionsForEvent(eventType, budget, guestCount) {
  const splits = BUDGET_SPLITS[eventType] || BUDGET_SPLITS.Other;
  const numBudget = Number(budget);

  const suggestedCategories = splits.map((s) => ({
    category: s.category,
    percentage: s.percentage,
    suggested_amount: Math.round(numBudget * (s.percentage / 100)),
  }));

  const tips = EVENT_TIPS[eventType] || [
    'Plan your venue and catering first as they consume approximately 50% of total budget.',
    'Always confirm service timings in writing with all vendors before booking.',
  ];

  return {
    event_type: eventType,
    guest_count: guestCount,
    budget: numBudget,
    suggested_categories: suggestedCategories,
    vendor_tips: tips,
  };
}

module.exports = {
  EVENT_TIPS,
  getSuggestionsForEvent,
};
