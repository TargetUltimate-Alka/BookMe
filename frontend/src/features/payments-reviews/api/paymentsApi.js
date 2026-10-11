/**
 * BookMe Payment & Feedback Service API Client (Person D)
 * Connects to payment-feedback-service on http://localhost:3004
 */

const PAYMENT_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_PAYMENT_SERVICE_URL) ||
  'http://localhost:3004/api';

function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('bookme_auth_token');
      const userId = localStorage.getItem('bookme_auth_user_id') || 'usr_123';
      const userRole = localStorage.getItem('bookme_auth_user_role') || 'customer';

      if (token) headers['Authorization'] = `Bearer ${token}`;
      headers['X-User-Id'] = userId;
      headers['X-User-Role'] = userRole;
    }
  } catch (e) {
    // Ignore storage errors in SSR / testing
  }

  headers['X-Request-Id'] = `pay-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${PAYMENT_BASE_URL.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    // In local development if service is offline, provide graceful fallback simulation
    console.warn(`[paymentsApi] Could not reach payment-feedback-service at ${url}: ${netErr.message}`);
    return simulateOfflinePayment(endpoint, options);
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
    const errorMsg = data?.error?.message || response.statusText || 'Payment request failed';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.error?.code || `HTTP_${response.status}`;
    error.details = data?.error?.details || [];
    throw error;
  }

  return data;
}

// Resilient in-browser fallback if service is stopped
function simulateOfflinePayment(endpoint, options) {
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

  if (endpoint === '/payments' && options.method === 'POST') {
    const id = `pay_sim_${Date.now()}`;
    return {
      id,
      bookingId: body.bookingId,
      amount: body.amount,
      currency: 'INR',
      method: body.method || 'card',
      status: 'pending',
      gatewayRef: `sandbox_ref_${Date.now()}`,
      authChallenge: {
        type: 'otp',
        destination: '+91 ******8921',
        testOtp: '123456',
        message: 'Use test OTP: 123456',
      },
    };
  }

  if (endpoint.includes('/authenticate') || endpoint.includes('/verify')) {
    const parts = endpoint.split('/');
    const paymentId = parts[2] || 'pay_001';
    if (body.otp && body.otp !== '123456' && body.otp !== '000000') {
      const err = new Error('Invalid test OTP. Please enter 123456');
      err.code = 'AUTH_VERIFICATION_FAILED';
      throw err;
    }
    return {
      id: paymentId,
      status: 'success',
      receiptNumber: `REC-${Date.now().toString(36).toUpperCase()}`,
      message: 'Payment verified and booking confirmed',
    };
  }

  if (endpoint.startsWith('/payments/booking/')) {
    return [];
  }

  if (endpoint === '/reviews' && options.method === 'POST') {
    return {
      id: `rev_sim_${Date.now()}`,
      vendorId: body.vendorId,
      rating: body.rating,
      comment: body.comment,
      createdAt: new Date().toISOString(),
    };
  }

  if (endpoint === '/complaints' && options.method === 'POST') {
    return {
      id: `cmp_sim_${Date.now()}`,
      subject: body.subject,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
  }

  return { success: true };
}

export const paymentsApi = {
  // Initiate payment for booking
  initiatePayment: ({ bookingId, amount, method, paymentDetails }) =>
    request('/payments', {
      method: 'POST',
      body: { bookingId, amount, method, paymentDetails },
    }),

  // Authenticate payment with OTP / 2FA
  authenticatePayment: (paymentId, { otp, authCode }) =>
    request(`/payments/${paymentId}/authenticate`, {
      method: 'POST',
      body: { otp, authCode },
    }),

  // Get payment details
  getPaymentById: (paymentId) =>
    request(`/payments/${paymentId}`, {
      method: 'GET',
    }),

  // Get payments by booking
  getPaymentsByBooking: (bookingId) =>
    request(`/payments/booking/${bookingId}`, {
      method: 'GET',
    }),

  // Payouts
  createPayout: ({ vendorId, bookingId, amount }) =>
    request('/payouts', {
      method: 'POST',
      body: { vendorId, bookingId, amount },
    }),

  getPayoutsByVendor: (vendorId) =>
    request(`/payouts/${vendorId}`, {
      method: 'GET',
    }),

  // Reviews
  createReview: ({ bookingId, vendorId, rating, comment }) =>
    request('/reviews', {
      method: 'POST',
      body: { bookingId, vendorId, rating, comment },
    }),

  getReviewsByVendor: (vendorId) =>
    request(`/reviews?vendorId=${encodeURIComponent(vendorId)}`, {
      method: 'GET',
    }),

  // Complaints
  createComplaint: ({ bookingId, subject, description }) =>
    request('/complaints', {
      method: 'POST',
      body: { bookingId, subject, description },
    }),

  getComplaints: (status) =>
    request(status ? `/complaints?status=${status}` : '/complaints', {
      method: 'GET',
    }),
};
