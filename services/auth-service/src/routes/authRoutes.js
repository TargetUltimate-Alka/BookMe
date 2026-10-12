const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const {
  authLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  loginLimiter,
} = require('../middleware/rateLimiter');

// Public OTP endpoints
router.post('/otp/send', otpSendLimiter, (req, res, next) => authController.sendOtp(req, res, next));
router.post('/otp/verify', otpVerifyLimiter, (req, res, next) => authController.verifyOtp(req, res, next));

// Public credentials endpoints
router.post('/register', authLimiter, (req, res, next) => authController.register(req, res, next));
router.post('/login', loginLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

// Protected session endpoints
router.post('/logout', authMiddleware, (req, res, next) => authController.logout(req, res, next));
router.get('/me', authMiddleware, (req, res, next) => authController.getMe(req, res, next));
router.patch('/me', authMiddleware, (req, res, next) => authController.updateMe(req, res, next));

// Protected terms & agreements endpoints (FR-ONB-04, FR-ONB-05)
router.post('/agreements/accept', authMiddleware, (req, res, next) => authController.acceptTerms(req, res, next));
router.get('/agreements/status', authMiddleware, (req, res, next) => authController.getAgreementStatus(req, res, next));

module.exports = router;
