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

// GET /api/reviews?vendorId=vnd_456
router.get(
  '/',
  reviewController.getReviews
);

module.exports = router;
