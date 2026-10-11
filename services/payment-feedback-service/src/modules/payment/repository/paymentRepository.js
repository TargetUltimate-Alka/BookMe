const { query, isPgActive } = require('../../../shared/db');
const inMemoryStore = require('../../../shared/inMemoryStore');

class PaymentRepository {
  async savePayment(payment) {
    if (!isPgActive()) {
      return inMemoryStore.savePayment(payment);
    }

    const text = `
      INSERT INTO payments (id, booking_id, customer_id, amount, currency, method, status, gateway_ref, auth_challenge, payment_details, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        gateway_ref = EXCLUDED.gateway_ref,
        auth_challenge = EXCLUDED.auth_challenge,
        payment_details = EXCLUDED.payment_details,
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;
    const params = [
      payment.id,
      payment.booking_id || payment.bookingId,
      payment.customer_id || payment.customerId,
      payment.amount,
      payment.currency || 'INR',
      payment.method,
      payment.status,
      payment.gateway_ref || payment.gatewayRef,
      JSON.stringify(payment.auth_challenge || payment.authChallenge || {}),
      JSON.stringify(payment.payment_details || payment.paymentDetails || {}),
      payment.created_at || new Date().toISOString(),
      new Date().toISOString(),
    ];

    try {
      const res = await query(text, params);
      return res.rows[0];
    } catch {
      return inMemoryStore.savePayment(payment);
    }
  }

  async findById(id) {
    if (!isPgActive()) {
      return inMemoryStore.findPaymentById(id);
    }

    try {
      const res = await query('SELECT * FROM payments WHERE id = $1', [id]);
      if (res.rows.length === 0) return inMemoryStore.findPaymentById(id);
      return res.rows[0];
    } catch {
      return inMemoryStore.findPaymentById(id);
    }
  }

  async findByBookingId(bookingId) {
    if (!isPgActive()) {
      return inMemoryStore.findPaymentsByBookingId(bookingId);
    }

    try {
      const res = await query('SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC', [bookingId]);
      if (res.rows.length === 0) return inMemoryStore.findPaymentsByBookingId(bookingId);
      return res.rows;
    } catch {
      return inMemoryStore.findPaymentsByBookingId(bookingId);
    }
  }

  async findByCustomerId(customerId) {
    if (!isPgActive()) {
      return inMemoryStore.findPaymentsByCustomerId(customerId);
    }

    try {
      const res = await query('SELECT * FROM payments WHERE customer_id = $1 ORDER BY created_at DESC', [customerId]);
      return res.rows;
    } catch {
      return inMemoryStore.findPaymentsByCustomerId(customerId);
    }
  }

  async findAll() {
    if (!isPgActive()) {
      return inMemoryStore.findAllPayments();
    }

    try {
      const res = await query('SELECT * FROM payments ORDER BY created_at DESC');
      return res.rows;
    } catch {
      return inMemoryStore.findAllPayments();
    }
  }

  // Payouts
  async savePayout(payout) {
    if (!isPgActive()) {
      return inMemoryStore.savePayout(payout);
    }

    const text = `
      INSERT INTO payouts (id, vendor_id, booking_id, amount, currency, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const params = [
      payout.id,
      payout.vendor_id || payout.vendorId,
      payout.booking_id || payout.bookingId,
      payout.amount,
      payout.currency || 'INR',
      payout.status || 'processed',
      payout.created_at || new Date().toISOString(),
    ];

    try {
      const res = await query(text, params);
      return res.rows[0];
    } catch {
      return inMemoryStore.savePayout(payout);
    }
  }

  async findPayoutsByVendorId(vendorId) {
    if (!isPgActive()) {
      return inMemoryStore.findPayoutsByVendorId(vendorId);
    }

    try {
      const res = await query('SELECT * FROM payouts WHERE vendor_id = $1 ORDER BY created_at DESC', [vendorId]);
      return res.rows;
    } catch {
      return inMemoryStore.findPayoutsByVendorId(vendorId);
    }
  }
}

module.exports = new PaymentRepository();
