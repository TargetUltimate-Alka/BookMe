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

  async listBookings(req, res, next) {
    try {
      let result;
      if (req.user && req.user.role === 'customer' && typeof bookingService.listCustomerBookings === 'function') {
        result = await bookingService.listCustomerBookings(req.user.id, req.query);
      } else if (req.user && req.user.role === 'vendor' && typeof bookingService.listVendorBookings === 'function') {
        result = await bookingService.listVendorBookings(req.user, req.query);
      } else {
        result = await bookingService.listBookings(req.user, req.query);
      }
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listCustomerBookings(req, res, next) {
    try {
      const result = await bookingService.listCustomerBookings(req.user.id, req.query);
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

  async getBookingById(req, res, next) {
    try {
      const result = await bookingService.getBookingById(req.params.id, req.user);
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
      const reason = req.body ? req.body.reason : 'Declined';
      const result = await bookingService.rejectBooking(req.params.id, req.user, reason);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async submitCounterOffer(req, res, next) {
    try {
      const result = await bookingService.submitCounterOffer(req.params.id, req.user, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async acceptCounterOffer(req, res, next) {
    try {
      const { id: bookingId, counterId } = req.params;
      const result = await bookingService.acceptCounterOffer(bookingId, counterId, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async selectDeliveryChoice(req, res, next) {
    try {
      const result = await bookingService.selectDeliveryChoice(req.params.id, req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async calculateRushQuote(req, res, next) {
    try {
      const payload = { ...(req.query || {}), ...(req.body || {}) };
      const result = await bookingService.calculateRushQuote(payload);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async vendorCheckIn(req, res, next) {
    try {
      const result = await bookingService.vendorCheckIn(req.params.id, req.user, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async completeBooking(req, res, next) {
    try {
      let result;
      if (typeof bookingService.completeBooking === 'function') {
        result = await bookingService.completeBooking(req.params.id, req.user);
      } else {
        result = await bookingService.confirmBookingCompletion(req.params.id, req.user);
      }
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async confirmBookingCompletion(req, res, next) {
    try {
      let result;
      if (typeof bookingService.completeBooking === 'function') {
        result = await bookingService.completeBooking(req.params.id, req.user);
      } else {
        result = await bookingService.confirmBookingCompletion(req.params.id, req.user);
      }
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async previewCancellationCharges(req, res, next) {
    try {
      const result = await bookingService.previewCancellationCharges(req.params.id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const reason = req.body ? req.body.reason : 'Cancelled by user';
      const forceMajeure = req.body ? req.body.forceMajeure : false;
      const result = await bookingService.cancelBooking(req.params.id, req.user, reason, forceMajeure);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async raiseBookingDispute(req, res, next) {
    try {
      const reason = req.body ? req.body.reason : 'Dispute filed';
      const result = await bookingService.raiseBookingDispute(req.params.id, req.user, reason);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getBookingTimeline(req, res, next) {
    try {
      const result = await bookingService.getBookingTimeline(req.params.id, req.user);
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

  async internalConfirmDeposit(req, res, next) {
    try {
      const result = await bookingService.internalConfirmDeposit(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BookingController();
