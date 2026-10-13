/**
 * Base API Client for event-booking-service
 * Supports dynamic configuration, auth headers injection, SRS §11 error extraction,
 * and resilient in-browser sandbox simulation when running online (e.g. Netlify).
 */

const BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.VITE_EVENT_BOOKING_SERVICE_URL || import.meta.env.VITE_API_URL)) ||
  'http://localhost:4003';

// Default identity for local testing / DEV_AUTH_BYPASS mode
let currentAuth = {
  userId: 'usr_123',
  userRole: 'customer',
};

export function setAuthContext(userId, userRole) {
  currentAuth = {
    userId: userId || 'usr_123',
    userRole: userRole || 'customer',
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bookme_auth_user_id', currentAuth.userId);
      localStorage.setItem('bookme_auth_user_role', currentAuth.userRole);
    }
  } catch {
    // Ignore storage errors in non-browser envs
  }
}

export function getAuthContext() {
  try {
    if (typeof localStorage !== 'undefined') {
      const storedId = localStorage.getItem('bookme_auth_user_id');
      const storedRole = localStorage.getItem('bookme_auth_user_role');
      if (storedId) currentAuth.userId = storedId;
      if (storedRole) currentAuth.userRole = storedRole;
    }
  } catch {
    // Ignore
  }
  return currentAuth;
}

/**
 * In-browser sandbox simulation for event-booking-service when running online without a backend
 */
function simulateOfflineEventsBooking(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body
    ? typeof options.body === 'string'
      ? JSON.parse(options.body)
      : options.body
    : {};

  // 1. Events list
  if (
    endpoint === '/events' ||
    endpoint.startsWith('/events?')
  ) {
    if (method === 'GET') {
      let saved = [];
      try {
        const stored = localStorage.getItem('bookme_stored_events');
        if (stored) saved = JSON.parse(stored);
      } catch {
        // Ignore
      }

      const defaultEvents = [
        {
          id: 'c1f1c8a6-8096-4a57-8984-b040e698ea12',
          customer_id: 'usr_123',
          name: 'Aarav & Maya Wedding',
          event_type: 'Wedding',
          event_date: '2026-12-15',
          budget: 500000,
          guest_count: 200,
          city: 'Ahmedabad',
          status: 'PLANNING',
          days_left: 65,
          created_at: new Date().toISOString(),
        },
      ];

      const data = saved.length > 0 ? saved : defaultEvents;
      return { data, meta: { total: data.length, page: 1, limit: 10, totalPages: 1 } };
    }

    if (method === 'POST') {
      const id = `ev_${Date.now()}`;
      const newEvent = {
        id,
        customer_id: 'usr_123',
        name: body.name || 'My Celebration Event',
        event_type: body.event_type || 'Wedding',
        event_date: body.event_date || '2026-12-25',
        budget: Number(body.budget) || 300000,
        guest_count: Number(body.guest_count) || 150,
        city: body.city || 'Mumbai',
        status: 'PLANNING',
        days_left: 70,
        created_at: new Date().toISOString(),
        budget_items: [
          { category: 'Venue & Catering', planned_amount: Number(body.budget || 300000) * 0.5, actual_amount: 0 },
          { category: 'Photography & Video', planned_amount: Number(body.budget || 300000) * 0.2, actual_amount: 0 },
          { category: 'Decoration & Floral', planned_amount: Number(body.budget || 300000) * 0.2, actual_amount: 0 },
          { category: 'Music & Entertainment', planned_amount: Number(body.budget || 300000) * 0.1, actual_amount: 0 },
        ],
        checklist_count: 6,
      };

      try {
        const stored = localStorage.getItem('bookme_stored_events');
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(newEvent);
        localStorage.setItem('bookme_stored_events', JSON.stringify(list));
      } catch {
        // Ignore
      }

      return newEvent;
    }
  }

  // 2. Event Dashboard
  if (endpoint.includes('/dashboard')) {
    return {
      event: {
        id: 'c1f1c8a6-8096-4a57-8984-b040e698ea12',
        name: 'Aarav & Maya Wedding',
        event_type: 'Wedding',
        event_date: '2026-12-15',
        days_left: 65,
        status: 'PLANNING',
      },
      progress: { percentage: 40, confirmed_categories: 1, total_budget_categories: 4 },
      budget: { total: 500000, planned: 500000, actual: 45000, remaining: 455000, overBudget: false },
      checklist: { total: 8, completed: 3, pending: 5, overdue: 0 },
      bookings: [
        {
          id: 'bkg_555',
          vendor_id: 'vnd_sunset_caterers',
          vendor_name: 'Sunset Royal Caterers & Event Crafters',
          category: 'Catering',
          amount: 45000,
          status: 'ACCEPTED',
          booking_date: '2026-12-15',
        },
      ],
    };
  }

  // 3. Bookings list (Customer)
  if (
    (endpoint === '/bookings' || endpoint.startsWith('/bookings?')) &&
    !endpoint.includes('/vendor')
  ) {
    if (method === 'GET') {
      let saved = [];
      try {
        const stored = localStorage.getItem('bookme_stored_bookings');
        if (stored) saved = JSON.parse(stored);
      } catch {
        // Ignore
      }

      const defaultBookings = [
        {
          id: 'bkg_555',
          event_id: 'c1f1c8a6-8096-4a57-8984-b040e698ea12',
          customer_id: 'usr_123',
          vendor_id: 'vnd_sunset_caterers',
          vendor_name: 'Sunset Royal Caterers & Event Crafters',
          vendor_name_snapshot: 'Sunset Royal Caterers & Event Crafters',
          package_name: 'Royal Destination Feast',
          package_name_snapshot: 'Royal Destination Feast',
          category: 'Catering',
          amount: 45000,
          price_snapshot: 45000,
          booking_date: '2026-12-15',
          status: 'ACCEPTED', // ACCEPTED state so customer can immediately test checkout!
          payment_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      const data = saved.length > 0 ? saved : defaultBookings;
      return { data, meta: { total: data.length, page: 1, limit: 10, totalPages: 1 } };
    }

    if (method === 'POST') {
      const id = `bkg_${Date.now()}`;
      const newBkg = {
        id,
        event_id: body.event_id || 'c1f1c8a6-8096-4a57-8984-b040e698ea12',
        customer_id: 'usr_123',
        vendor_id: body.vendor_id || 'vnd_sunset_caterers',
        vendor_name: body.vendor_name || 'Sunset Royal Caterers',
        package_name: body.package_name || 'Standard Package',
        category: body.category || 'Catering',
        amount: body.amount || body.custom_price || 45000,
        price_snapshot: body.amount || body.custom_price || 45000,
        booking_date: body.booking_date || '2026-12-15',
        status: 'ACCEPTED',
        payment_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      };

      try {
        const stored = localStorage.getItem('bookme_stored_bookings');
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(newBkg);
        localStorage.setItem('bookme_stored_bookings', JSON.stringify(list));
      } catch {
        // Ignore
      }

      return newBkg;
    }
  }

  // 4. Vendor requests list
  if (endpoint.includes('/bookings/vendor')) {
    return {
      data: [
        {
          id: 'bkg_555',
          event_id: 'c1f1c8a6-8096-4a57-8984-b040e698ea12',
          customer_id: 'usr_123',
          customer_name: 'Aarav Sharma',
          vendor_id: 'vnd_sunset_caterers',
          package_name: 'Royal Destination Feast',
          category: 'Catering',
          amount: 45000,
          price_snapshot: 45000,
          status: 'ACCEPTED',
          booking_date: '2026-12-15',
        },
      ],
      meta: { total: 1 },
    };
  }

  // 5. Single booking details
  if (endpoint.startsWith('/bookings/') && method === 'GET') {
    const bkgId = endpoint.split('/')[2];
    let found = null;
    try {
      const stored = localStorage.getItem('bookme_stored_bookings');
      if (stored) {
        const list = JSON.parse(stored);
        found = list.find((b) => b.id === bkgId);
      }
    } catch {
      // Ignore
    }

    return (
      found || {
        id: bkgId || 'bkg_555',
        event_id: 'c1f1c8a6-8096-4a57-8984-b040e698ea12',
        customer_id: 'usr_123',
        vendor_id: 'vnd_sunset_caterers',
        vendor_name: 'Sunset Royal Caterers & Event Crafters',
        vendor_name_snapshot: 'Sunset Royal Caterers & Event Crafters',
        package_name: 'Royal Destination Feast',
        package_name_snapshot: 'Royal Destination Feast',
        category: 'Catering',
        amount: 45000,
        price_snapshot: 45000,
        booking_date: '2026-12-15',
        status: 'ACCEPTED',
        payment_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        items: [
          { name: 'Royal Destination Feast Base Buffet', quantity: 1, unitPrice: 35000, subtotal: 35000 },
          { name: 'Live Multi-Cuisine Counters & Staffing', quantity: 1, unitPrice: 10000, subtotal: 10000 },
        ],
      }
    );
  }

  // 6. Status transitions
  if (
    endpoint.includes('/accept') ||
    endpoint.includes('/confirm') ||
    endpoint.includes('/reject') ||
    endpoint.includes('/cancel') ||
    endpoint.includes('/complete')
  ) {
    const parts = endpoint.split('/');
    const bkgId = parts[2];
    const newStatus = endpoint.includes('/accept')
      ? 'ACCEPTED'
      : endpoint.includes('/confirm')
      ? 'CONFIRMED'
      : endpoint.includes('/reject')
      ? 'REJECTED'
      : endpoint.includes('/complete')
      ? 'COMPLETED'
      : 'CANCELLED';

    try {
      const stored = localStorage.getItem('bookme_stored_bookings');
      if (stored) {
        const list = JSON.parse(stored);
        const item = list.find((b) => b.id === bkgId);
        if (item) {
          item.status = newStatus;
          localStorage.setItem('bookme_stored_bookings', JSON.stringify(list));
        }
      }
    } catch {
      // Ignore
    }

    return { id: bkgId, status: newStatus };
  }

  return { success: true };
}

export async function request(endpoint, options = {}) {
  const auth = getAuthContext();
  const url = `${BASE_URL.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let storedToken = null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      storedToken = sessionStorage.getItem('bookme_access_token');
    }
    if (!storedToken && typeof localStorage !== 'undefined') {
      storedToken = localStorage.getItem('bookme_auth_token');
    }
  } catch {
    // Ignore
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': auth.userId,
    'X-User-Role': auth.userRole,
    'X-Request-Id': `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    console.warn(
      `[events-booking client] Network error connecting to ${url} (${netErr.message}). Using resilient in-browser sandbox.`
    );
    return simulateOfflineEventsBooking(endpoint, options);
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || 'An unexpected error occurred';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.error?.code || `HTTP_${response.status}`;
    error.details = data?.error?.details || [];
    error.raw = data;
    throw error;
  }

  return data;
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};
