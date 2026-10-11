/**
 * Default checklist task templates per event type (SRS §5.10)
 */
const CHECKLIST_TEMPLATES = {
  Wedding: [
    { task: 'Book venue and finalize caterer', offsetDays: 90, category: 'Venue & Catering' },
    { task: 'Hire photographer and videographer', offsetDays: 60, category: 'Photography & Video' },
    { task: 'Finalize theme and floral decoration', offsetDays: 45, category: 'Decoration & Floral' },
    { task: 'Book DJ / Music & Sound setup', offsetDays: 30, category: 'Music & Entertainment' },
    { task: 'Schedule bridal makeup trial', offsetDays: 20, category: 'Makeup & Styling' },
    { task: 'Send invitations and track RSVPs', offsetDays: 15, category: 'General' },
    { task: 'Confirm guest count and dietary needs', offsetDays: 7, category: 'Venue & Catering' },
    { task: 'Review final day-of coordination schedule', offsetDays: 2, category: 'General' },
  ],
  Corporate: [
    { task: 'Reserve conference venue and AV system', offsetDays: 60, category: 'Venue & Audio-Visual' },
    { task: 'Finalize keynote speakers and schedule', offsetDays: 30, category: 'General' },
    { task: 'Order event banners and badge collateral', offsetDays: 15, category: 'Event Production & Branding' },
    { task: 'Confirm catering and coffee breaks', offsetDays: 7, category: 'Catering & Refreshments' },
    { task: 'Test technical equipment and sound', offsetDays: 1, category: 'Venue & Audio-Visual' },
  ],
  Birthday: [
    { task: 'Book party venue or hall', offsetDays: 30, category: 'Venue & Catering' },
    { task: 'Order customized cake and catering', offsetDays: 14, category: 'Entertainment & Cake' },
    { task: 'Finalize balloon decor and theme', offsetDays: 7, category: 'Decoration & Theme' },
    { task: 'Send digital invitations', offsetDays: 5, category: 'General' },
  ],
  Anniversary: [
    { task: 'Reserve private dining or event hall', offsetDays: 30, category: 'Venue & Catering' },
    { task: 'Hire photographer for celebration', offsetDays: 20, category: 'Photography & Video' },
    { task: 'Order custom cake and floral decor', offsetDays: 10, category: 'Decoration & Theme' },
    { task: 'Send invites to close family & friends', offsetDays: 7, category: 'General' },
  ],
  Social: [
    { task: 'Book venue space', offsetDays: 30, category: 'Venue & Catering' },
    { task: 'Arrange catering and refreshments', offsetDays: 14, category: 'Venue & Catering' },
    { task: 'Set up decoration and music', offsetDays: 7, category: 'Music & Entertainment' },
    { task: 'Confirm guest list and attendance', offsetDays: 3, category: 'General' },
  ],
  Other: [
    { task: 'Secure venue reservation', offsetDays: 30, category: 'Venue & Catering' },
    { task: 'Arrange food and refreshments', offsetDays: 14, category: 'Venue & Catering' },
    { task: 'Organize setup and decor', offsetDays: 7, category: 'Decoration & Setup' },
    { task: 'Final check on attendee details', offsetDays: 2, category: 'General' },
  ],
};

/**
 * Calculates due dates for checklist tasks given the event date.
 * Rule: due_date = event_date - N days, never earlier than today.
 * @param {string} eventType
 * @param {string|Date} eventDateStr - 'YYYY-MM-DD'
 * @returns {Array<{ task: string, category: string, due_date: string, done: boolean }>}
 */
function generateDefaultChecklist(eventType, eventDateStr) {
  const templates = CHECKLIST_TEMPLATES[eventType] || CHECKLIST_TEMPLATES.Other;
  const eventDate = new Date(eventDateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return templates.map((tmpl) => {
    const targetDate = new Date(eventDate);
    targetDate.setDate(targetDate.getDate() - tmpl.offsetDays);

    // If offset lands before today, constrain due date to today
    const dueDate = targetDate < now ? now : targetDate;
    const formattedDue = dueDate.toISOString().split('T')[0];

    return {
      task: tmpl.task,
      category: tmpl.category,
      due_date: formattedDue,
      done: false,
    };
  });
}

module.exports = {
  CHECKLIST_TEMPLATES,
  generateDefaultChecklist,
};
