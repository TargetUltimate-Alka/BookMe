const express = require('express');
const reviewController = require('../controllers/reviewController');
const { authMiddleware } = require('../../../shared/middleware/authMiddleware');
const { validate } = require('../../../shared/middleware/validate');

const router = express.Router();

// POST /api/reviews
router.post(
  '/',
  authMiddleware,
  validate(['bookingId', 'vendorId', 'rating']),
  reviewController.createReview
);

// POST /api/reviews/:reviewId/reply (FR-REV-03: Single public vendor reply per review)
router.post(
  '/:reviewId/reply',
  authMiddleware,
  reviewController.replyToReview
);

// GET /api/reviews?vendorId=vnd_456
router.get(
  '/',
  reviewController.getReviews
);

module.exports = router;
