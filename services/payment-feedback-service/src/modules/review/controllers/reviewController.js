const reviewRepository = require('../repository/reviewRepository');
const vendorClient = require('../../../shared/vendorClient');
const logger = require('../../../shared/logger');
const crypto = require('crypto');

class ReviewController {
  async createReview(req, res, next) {
    try {
      const { bookingId, vendorId, rating, comment } = req.body;
      const customerId = req.user?.id || 'usr_123';

      if (!bookingId || !vendorId || rating === undefined) {
        const err = new Error('bookingId, vendorId, and rating are required');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      const numRating = Number(rating);
      if (numRating < 1 || numRating > 5) {
        const err = new Error('Rating must be between 1 and 5');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      // Check if already reviewed
      const existing = await reviewRepository.findByBookingId(bookingId);
      if (existing) {
        const err = new Error('You have already submitted a review for this booking');
        err.status = 409;
        err.code = 'ALREADY_REVIEWED';
        throw err;
      }

      const id = `rev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const review = {
        id,
        booking_id: bookingId,
        bookingId,
        vendor_id: vendorId,
        vendorId,
        customer_id: customerId,
        customerId,
        rating: numRating,
        comment: comment || '',
        vendor_reply: null,
        vendor_replied_at: null,
        created_at: new Date().toISOString(),
      };

      const saved = await reviewRepository.saveReview(review);
      logger.info(`Review created: ${id} for vendor ${vendorId}`);

      // Recalculate average rating and sync to vendor-service
      try {
        const vendorReviews = await reviewRepository.findByVendorId(vendorId);
        if (vendorReviews.length > 0) {
          const sum = vendorReviews.reduce((acc, r) => acc + Number(r.rating), 0);
          const avg = Number((sum / vendorReviews.length).toFixed(1));
          await vendorClient.updateVendorRating(vendorId, avg);
        }
      } catch (syncErr) {
        logger.warn(`Failed to update vendor rating average: ${syncErr.message}`);
      }

      res.status(201).json({
        id: saved.id,
        vendorId: saved.vendor_id || saved.vendorId,
        rating: Number(saved.rating),
        comment: saved.comment,
        vendorReply: saved.vendor_reply || null,
        createdAt: saved.created_at,
      });
    } catch (err) {
      next(err);
    }
  }

  // FR-REV-03: Vendors may post a single public reply per review
  async replyToReview(req, res, next) {
    try {
      const { reviewId } = req.params;
      const { reply } = req.body;

      if (!reply || !String(reply).trim()) {
        const err = new Error('reply text is required');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      const existing = await reviewRepository.findById(reviewId);
      if (!existing) {
        const err = new Error(`Review ${reviewId} not found`);
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (existing.vendor_reply) {
        const err = new Error('A vendor reply has already been posted for this review (FR-REV-03 allows a single public reply per review)');
        err.status = 409;
        err.code = 'ALREADY_REPLIED';
        throw err;
      }

      const updated = await reviewRepository.saveVendorReply(reviewId, String(reply).trim());
      res.status(200).json({
        id: updated.id,
        vendorId: updated.vendor_id || updated.vendorId,
        rating: Number(updated.rating),
        comment: updated.comment,
        vendorReply: updated.vendor_reply,
        vendorRepliedAt: updated.vendor_replied_at,
        createdAt: updated.created_at,
      });
    } catch (err) {
      next(err);
    }
  }

  async getReviews(req, res, next) {
    try {
      const { vendorId } = req.query;
      if (!vendorId) {
        const err = new Error('vendorId query parameter is required');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      const list = await reviewRepository.findByVendorId(vendorId);
      const formatted = list.map((r) => ({
        id: r.id,
        rating: Number(r.rating),
        comment: r.comment,
        vendorReply: r.vendor_reply || null,
        vendorRepliedAt: r.vendor_replied_at || null,
        bookingId: r.booking_id || r.bookingId,
        createdAt: r.created_at,
      }));

      res.status(200).json(formatted);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReviewController();
