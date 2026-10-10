// Main feature barrel export for events-booking
import './eventsBooking.css';

// API Clients
export * from './api/client.js';
export * from './api/eventsApi.js';
export * from './api/bookingsApi.js';

// Hooks
export * from './hooks/useEvents.js';
export * from './hooks/useEvent.js';
export * from './hooks/useBudget.js';
export * from './hooks/useChecklist.js';
export * from './hooks/useEventDashboard.js';
export * from './hooks/useBookings.js';
export * from './hooks/useBooking.js';
export * from './hooks/useBookingActions.js';

// Components
export * from './components/BookingStatusBadge.jsx';
export * from './components/EventCard.jsx';
export * from './components/EventForm.jsx';
export * from './components/SuggestionList.jsx';
export * from './components/BudgetTable.jsx';
export * from './components/BudgetBar.jsx';
export * from './components/ChecklistItem.jsx';
export * from './components/BookingCard.jsx';
export * from './components/BookingTimeline.jsx';
export * from './components/BookVendorModal.jsx';
export * from './components/ConfirmDialog.jsx';
export * from './components/Modal.jsx';
export * from './components/Spinner.jsx';
export * from './components/EmptyState.jsx';

// Customer Pages
export * from './pages/customer/CreateEventPage.jsx';
export * from './pages/customer/MyEventsPage.jsx';
export * from './pages/customer/EventDashboardPage.jsx';
export * from './pages/customer/MyBookingsPage.jsx';
export * from './pages/customer/BookingDetailsPage.jsx';
export * from './pages/customer/BookingConfirmationPage.jsx';

// Vendor Pages
export * from './pages/vendor/VendorRequestsPage.jsx';
export * from './pages/vendor/VendorRequestDetailsPage.jsx';

// Admin Pages
export * from './pages/admin/AdminBookingsPage.jsx';
export * from './pages/admin/AdminBookingDetailsPage.jsx';

// Routes & Utilities
export * from './routes.jsx';
export * from './utils/formatters.js';
