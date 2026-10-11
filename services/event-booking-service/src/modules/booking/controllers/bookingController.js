const bookingService = require('../services/bookingService');

class BookingController {
  async createBooking(req, res, next) {
    try {
      const customerId = req.user.id;
      const result = await bookingService.createBooking(customerId, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getBookingById(req, res, next) {
    try {
      const result = await bookingService.getBookingById(req.params.id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listCustomerBookings(req, res, next) {
    try {
      const customerId = req.user.id;
      const result = await bookingService.listCustomerBookings(customerId, req.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listVendorBookings(req, res, next) {
    try {
      const result = await bookingService.listVendorBookings(req.user, req.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async acceptBooking(req, res, next) {
    try {
      const result = await bookingService.acceptBooking(req.params.id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async rejectBooking(req, res, next) {
    try {
      const result = await bookingService.rejectBooking(req.params.id, req.user, req.body.reason);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const result = await bookingService.cancelBooking(req.params.id, req.user, req.body.reason);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async completeBooking(req, res, next) {
    try {
      const result = await bookingService.completeBooking(req.params.id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getInternalBooking(req, res, next) {
    try {
      const result = await bookingService.getInternalBooking(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async confirmBookingPayment(req, res, next) {
    try {
      const { paymentId, amount } = req.body;
      const { handlePaymentCompleted } = require('../events/consumers');
      await handlePaymentCompleted({
        bookingId: req.params.id,
        paymentId,
        amount,
      });
      res.status(200).json({ success: true, bookingId: req.params.id, status: 'CONFIRMED' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BookingController();
