import React from 'react';
import { CreateEventPage } from './pages/customer/CreateEventPage.jsx';
import { MyEventsPage } from './pages/customer/MyEventsPage.jsx';
import { EventDashboardPage } from './pages/customer/EventDashboardPage.jsx';
import { MyBookingsPage } from './pages/customer/MyBookingsPage.jsx';
import { BookingDetailsPage } from './pages/customer/BookingDetailsPage.jsx';
import { BookingConfirmationPage } from './pages/customer/BookingConfirmationPage.jsx';
import { VendorRequestsPage } from './pages/vendor/VendorRequestsPage.jsx';
import { VendorRequestDetailsPage } from './pages/vendor/VendorRequestDetailsPage.jsx';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage.jsx';
import { AdminBookingDetailsPage } from './pages/admin/AdminBookingDetailsPage.jsx';

/**
 * Complete route objects exported for mounting into the application router.
 */
export const eventBookingRoutes = [
  // Customer Routes
  {
    path: '/events',
    element: <MyEventsPage />,
  },
  {
    path: '/events/new',
    element: <CreateEventPage />,
  },
  {
    path: '/events/:id',
    element: <EventDashboardPage />,
  },
  {
    path: '/bookings',
    element: <MyBookingsPage />,
  },
  {
    path: '/bookings/:id',
    element: <BookingDetailsPage />,
  },
  {
    path: '/bookings/:id/confirmation',
    element: <BookingConfirmationPage />,
  },

  // Vendor Routes
  {
    path: '/vendor/requests',
    element: <VendorRequestsPage />,
  },
  {
    path: '/vendor/requests/:id',
    element: <VendorRequestDetailsPage />,
  },

  // Admin Routes
  {
    path: '/admin/bookings',
    element: <AdminBookingsPage />,
  },
  {
    path: '/admin/bookings/:id',
    element: <AdminBookingDetailsPage />,
  },
];
