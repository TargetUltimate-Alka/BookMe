const paymentService = require('../services/paymentService');

class PaymentController {
  async initiatePayment(req, res, next) {
    try {
      const { bookingId, amount, method, paymentDetails } = req.body;
      const customerId = req.user?.id || 'usr_123';
      const result = await paymentService.initiatePayment({
        bookingId,
        amount,
        method,
        paymentDetails,
        customerId,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async authenticatePayment(req, res, next) {
    try {
      const { id } = req.params;
      const { otp, authCode } = req.body;
      const result = await paymentService.authenticatePayment(id, { otp, authCode });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async handleWebhook(req, res, next) {
    try {
      const { id } = req.params;
      const result = await paymentService.handleWebhook(id, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getPaymentById(req, res, next) {
    try {
      const result = await paymentService.getPaymentById(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getPaymentsByBooking(req, res, next) {
    try {
      const result = await paymentService.getPaymentsByBooking(req.params.bookingId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // Payouts
  async createPayout(req, res, next) {
    try {
      const { vendorId, bookingId, amount } = req.body;
      const result = await paymentService.createPayout({ vendorId, bookingId, amount });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getPayoutsByVendor(req, res, next) {
    try {
      const result = await paymentService.getPayoutsByVendor(req.params.vendorId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaymentController();
