// Resilient in-memory fallback store when PostgreSQL is offline
const payments = new Map();
const payouts = new Map();
const reviews = new Map();
const complaints = new Map();

module.exports = {
  // Payments
  payments,
  savePayment: async (payment) => {
    payments.set(payment.id, { ...payment, updated_at: new Date().toISOString() });
    return payments.get(payment.id);
  },
  findPaymentById: async (id) => payments.get(id) || null,
  findPaymentsByBookingId: async (bookingId) => {
    return Array.from(payments.values()).filter((p) => p.booking_id === bookingId || p.bookingId === bookingId);
  },
  findPaymentsByCustomerId: async (customerId) => {
    return Array.from(payments.values()).filter((p) => p.customer_id === customerId || p.customerId === customerId);
  },
  findAllPayments: async () => Array.from(payments.values()),

  // Payouts
  payouts,
  savePayout: async (payout) => {
    payouts.set(payout.id, { ...payout, created_at: payout.created_at || new Date().toISOString() });
    return payouts.get(payout.id);
  },
  findPayoutsByVendorId: async (vendorId) => {
    return Array.from(payouts.values()).filter((p) => p.vendor_id === vendorId || p.vendorId === vendorId);
  },

  // Reviews
  reviews,
  saveReview: async (review) => {
    reviews.set(review.id, { ...review, created_at: review.created_at || new Date().toISOString() });
    return reviews.get(review.id);
  },
  findReviewByBookingId: async (bookingId) => {
    return Array.from(reviews.values()).find((r) => r.booking_id === bookingId || r.bookingId === bookingId) || null;
  },
  findReviewsByVendorId: async (vendorId) => {
    return Array.from(reviews.values()).filter((r) => r.vendor_id === vendorId || r.vendorId === vendorId);
  },

  // Complaints
  complaints,
  saveComplaint: async (complaint) => {
    complaints.set(complaint.id, { ...complaint, created_at: complaint.created_at || new Date().toISOString() });
    return complaints.get(complaint.id);
  },
  findComplaintById: async (id) => complaints.get(id) || null,
  findComplaints: async (status) => {
    const list = Array.from(complaints.values());
    if (status) return list.filter((c) => c.status === status);
    return list;
  },
};
