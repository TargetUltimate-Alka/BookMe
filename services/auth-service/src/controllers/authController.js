const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');
const userRepository = require('../repository/userRepository');
const tokenRepository = require('../repository/tokenRepository');
const agreementRepository = require('../repository/agreementRepository');
const otpRepository = require('../repository/otpRepository');
const otpService = require('../services/otpService');
const { hashPhone, encrypt, decrypt } = require('../services/encryptionService');
const { hashToken, generateAccessToken, generateRefreshTokenData } = require('../services/tokenService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+91[0-9]{10}$/;
const VALID_ROLES = [
  'customer',
  'vendor',
  'superAdmin',
  'verifier',
  'supportAgent',
  'financeAdmin',
  'contentModerator',
];

class AuthController {
  // 1. POST /v1/auth/otp/send (operationId: sendOtp)
  async sendOtp(req, res, next) {
    try {
      const { phone } = req.body || {};
      const result = await otpService.sendOtp(phone);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // 2. POST /v1/auth/otp/verify (operationId: verifyOtp)
  async verifyOtp(req, res, next) {
    try {
      const { phone, otp } = req.body || {};
      const result = await otpService.verifyOtp(phone, otp);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // 3. POST /v1/auth/register (operationId: registerUser)
  async register(req, res, next) {
    try {
      const { phone, verificationToken, name, email, password, role, acceptLiabilityTerms } = req.body || {};

      // 1. Validation
      const errors = [];

      if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone.trim())) {
        errors.push({ field: 'phone', issue: 'Valid phone number required (+91 followed by 10 digits)' });
      }

      if (!verificationToken || typeof verificationToken !== 'string') {
        errors.push({ field: 'verificationToken', issue: 'Valid verificationToken required from OTP verification' });
      }

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        errors.push({ field: 'name', issue: 'Name must be at least 2 characters long' });
      }

      if (email && (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()))) {
        errors.push({ field: 'email', issue: 'A valid email address is required' });
      }

      if (!password || typeof password !== 'string' || password.length < 8) {
        errors.push({ field: 'password', issue: 'Password must be at least 8 characters long' });
      }

      if (!role || !VALID_ROLES.includes(role)) {
        errors.push({ field: 'role', issue: `Role must be one of: ${VALID_ROLES.join(', ')}` });
      }

      if (errors.length > 0) {
        const err = new Error('Input validation failed');
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        err.details = errors;
        return next(err);
      }

      const cleanPhone = phone.trim();
      const phoneHash = hashPhone(cleanPhone);

      // 2. Check duplicate phone or email first (returns 409 CONFLICT)
      const existingByPhone = await userRepository.findByPhoneHash(phoneHash);
      if (existingByPhone) {
        const err = new Error('Phone number is already registered');
        err.code = 'CONFLICT';
        err.status = 409;
        err.details = [{ field: 'phone', issue: 'Phone already registered' }];
        return next(err);
      }

      const normalizedEmail = email ? email.trim().toLowerCase() : null;
      if (normalizedEmail) {
        const existingByEmail = await userRepository.findByEmail(normalizedEmail);
        if (existingByEmail) {
          const err = new Error('Email is already registered');
          err.code = 'CONFLICT';
          err.status = 409;
          err.details = [{ field: 'email', issue: 'Email already in use' }];
          return next(err);
        }
      }

      // 3. Validate and consume verification token
      const tokenRecord = await otpRepository.findVerificationToken(verificationToken);
      if (
        !tokenRecord ||
        tokenRecord.consumed ||
        tokenRecord.phone_hash !== phoneHash ||
        new Date(tokenRecord.expires_at) < new Date()
      ) {
        const err = new Error('Invalid, expired, or already used verification token');
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        err.details = [{ field: 'verificationToken', issue: 'Token is invalid or expired' }];
        return next(err);
      }
      await otpRepository.consumeVerificationToken(verificationToken);

      // 4. Hash password & Encrypt phone at rest
      const passwordHash = await bcrypt.hash(password, 10);
      const phoneEncrypted = encrypt(cleanPhone);
      const userId = crypto.randomUUID();

      // 5. Create user record
      const newUser = await userRepository.createUser({
        id: userId,
        name: name.trim(),
        phoneEncrypted,
        phoneHash,
        email: normalizedEmail,
        passwordHash,
        role,
        status: 'ACTIVE',
      });

      // 6. Record Damage Liability terms acceptance if customer & flag true (FR-ONB-04)
      if (acceptLiabilityTerms) {
        await agreementRepository.recordAcceptance({
          userId: newUser.id,
          agreementType: 'CUSTOMER_DAMAGE_LIABILITY',
          version: '1.0.0',
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'] || null,
        });
      }

      // 7. Issue tokens
      const accessToken = generateAccessToken(newUser);
      const refreshData = generateRefreshTokenData(newUser.id);

      await tokenRepository.createRefreshToken({
        id: refreshData.tokenId,
        userId: newUser.id,
        tokenHash: refreshData.tokenHash,
        familyId: refreshData.familyId,
        expiresAt: refreshData.expiresAt,
      });

      return res.status(201).json({
        id: newUser.id,
        name: newUser.name,
        role: newUser.role,
        accessToken,
        refreshToken: refreshData.rawToken,
        expiresIn: config.jwtExpiresIn,
      });
    } catch (err) {
      if (err.code === '23505') {
        const conflictErr = new Error('Phone or email is already registered');
        conflictErr.code = 'CONFLICT';
        conflictErr.status = 409;
        conflictErr.details = [];
        return next(conflictErr);
      }
      next(err);
    }
  }

  // 4. POST /v1/auth/login (operationId: loginUser)
  async login(req, res, next) {
    try {
      const { phone, password } = req.body || {};

      if (!phone || !password || typeof phone !== 'string' || typeof password !== 'string') {
        const err = new Error('Phone and password are required');
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        err.details = [];
        return next(err);
      }

      const cleanPhone = phone.trim();
      const phoneHash = hashPhone(cleanPhone);
      const user = await userRepository.findByPhoneHash(phoneHash);

      // Generic authentication error to prevent user enumeration
      const genericAuthError = () => {
        const err = new Error('Invalid credentials');
        err.code = 'UNAUTHORIZED';
        err.status = 401;
        err.details = [];
        return err;
      };

      if (!user) {
        return next(genericAuthError());
      }

      // Check account lockout
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        const err = new Error(`Account locked after 5 failed attempts. Please try again after ${remainingMinutes} minutes.`);
        err.code = 'UNAUTHORIZED';
        err.status = 401;
        err.details = [];
        return next(err);
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        await userRepository.incrementFailedAttempts(user.id, config.otpLockoutMinutes, config.otpMaxAttempts);
        return next(genericAuthError());
      }

      // Reset failed attempts on success
      await userRepository.resetFailedAttempts(user.id);

      // Issue tokens
      const accessToken = generateAccessToken(user);
      const refreshData = generateRefreshTokenData(user.id);

      await tokenRepository.createRefreshToken({
        id: refreshData.tokenId,
        userId: user.id,
        tokenHash: refreshData.tokenHash,
        familyId: refreshData.familyId,
        expiresAt: refreshData.expiresAt,
      });

      return res.status(200).json({
        accessToken,
        refreshToken: refreshData.rawToken,
        expiresIn: config.jwtExpiresIn,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. POST /v1/auth/refresh (operationId: refreshToken)
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body || {};

      if (!refreshToken || typeof refreshToken !== 'string') {
        const err = new Error('Refresh token is required');
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        err.details = [];
        return next(err);
      }

      const tokenHash = hashToken(refreshToken);
      const tokenRecord = await tokenRepository.findRefreshTokenByHash(tokenHash);

      if (!tokenRecord) {
        const err = new Error('Invalid or expired refresh token');
        err.code = 'UNAUTHORIZED';
        err.status = 401;
        err.details = [];
        return next(err);
      }

      // Reuse detection: if token is already revoked, immediately revoke entire family
      if (tokenRecord.revoked) {
        await tokenRepository.revokeTokenFamily(tokenRecord.family_id);
        const err = new Error('Refresh token reuse detected. All sessions revoked.');
        err.code = 'UNAUTHORIZED';
        err.status = 401;
        err.details = [];
        return next(err);
      }

      // Check expiry
      if (new Date(tokenRecord.expires_at) < new Date()) {
        const err = new Error('Refresh token has expired');
        err.code = 'UNAUTHORIZED';
        err.status = 401;
        err.details = [];
        return next(err);
      }

      const user = await userRepository.findById(tokenRecord.user_id);
      if (!user) {
        const err = new Error('Associated user not found');
        err.code = 'UNAUTHORIZED';
        err.status = 401;
        err.details = [];
        return next(err);
      }

      // Rotate: Revoke old refresh token
      await tokenRepository.revokeRefreshTokenByHash(tokenHash);

      // Issue new access token
      const newAccessToken = generateAccessToken(user);

      return res.status(200).json({
        accessToken: newAccessToken,
        expiresIn: config.jwtExpiresIn,
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. POST /v1/auth/logout (operationId: logoutUser)
  async logout(req, res, next) {
    try {
      const userId = req.user?.id;
      const { refreshToken } = req.body || {};

      if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        await tokenRepository.revokeRefreshTokenByHash(tokenHash);
      }

      if (userId) {
        await tokenRepository.revokeAllUserTokens(userId);
      }

      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  // 7. GET /v1/auth/me (operationId: getCurrentUser)
  async getMe(req, res, next) {
    try {
      const userId = req.user?.id;
      const user = await userRepository.findById(userId);

      if (!user) {
        const err = new Error('User profile not found');
        err.code = 'NOT_FOUND';
        err.status = 404;
        err.details = [];
        return next(err);
      }

      const decryptedPhone = decrypt(user.phone_encrypted);

      return res.status(200).json({
        id: user.id,
        name: user.name,
        phone: decryptedPhone,
        email: user.email || null,
        role: user.role,
        status: user.status || 'ACTIVE',
        createdAt: user.created_at,
      });
    } catch (err) {
      next(err);
    }
  }

  // 8. PATCH /v1/auth/me (operationId: updateCurrentUser)
  async updateMe(req, res, next) {
    try {
      const userId = req.user?.id;
      const { name, email } = req.body || {};

      if (!name && email === undefined) {
        const err = new Error('At least one of name or email must be provided');
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        err.details = [];
        return next(err);
      }

      if (name && (typeof name !== 'string' || name.trim().length < 2)) {
        const err = new Error('Name must be at least 2 characters long');
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        err.details = [{ field: 'name', issue: 'Must be at least 2 characters' }];
        return next(err);
      }

      if (email && (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()))) {
        const err = new Error('A valid email address is required');
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        err.details = [{ field: 'email', issue: 'Invalid email address' }];
        return next(err);
      }

      const updated = await userRepository.updateProfile(userId, { name, email });
      if (!updated) {
        const err = new Error('User profile not found');
        err.code = 'NOT_FOUND';
        err.status = 404;
        err.details = [];
        return next(err);
      }

      return res.status(200).json({
        id: updated.id,
        name: updated.name,
        email: updated.email || null,
      });
    } catch (err) {
      if (err.code === '23505') {
        const errConflict = new Error('Email is already registered by another account');
        errConflict.code = 'CONFLICT';
        errConflict.status = 409;
        errConflict.details = [{ field: 'email', issue: 'Email already in use' }];
        return next(errConflict);
      }
      next(err);
    }
  }

  // 9. POST /v1/auth/agreements/accept (operationId: acceptTerms)
  async acceptTerms(req, res, next) {
    try {
      const userId = req.user?.id;
      const { agreementType, version } = req.body || {};

      const validTypes = ['CUSTOMER_DAMAGE_LIABILITY', 'VENDOR_SERVICE_AGREEMENT'];
      if (!agreementType || !validTypes.includes(agreementType)) {
        const err = new Error('Invalid agreementType. Must be CUSTOMER_DAMAGE_LIABILITY or VENDOR_SERVICE_AGREEMENT');
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        err.details = [{ field: 'agreementType', issue: 'Invalid agreement type' }];
        return next(err);
      }

      if (!version || typeof version !== 'string') {
        const err = new Error('Agreement version is required');
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        err.details = [{ field: 'version', issue: 'Version string required' }];
        return next(err);
      }

      const record = await agreementRepository.recordAcceptance({
        userId,
        agreementType,
        version: version.trim(),
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || null,
      });

      return res.status(200).json({
        accepted: true,
        acceptedAt: record.accepted_at,
      });
    } catch (err) {
      next(err);
    }
  }

  // 10. GET /v1/auth/agreements/status (operationId: getAgreementStatus)
  async getAgreementStatus(req, res, next) {
    try {
      const userId = req.user?.id;
      const damageLiability = await agreementRepository.getLatestAcceptance(userId, 'CUSTOMER_DAMAGE_LIABILITY');
      const vendorAgreement = await agreementRepository.getLatestAcceptance(userId, 'VENDOR_SERVICE_AGREEMENT');

      const latestVersion = vendorAgreement?.version || damageLiability?.version || '1.0.0';

      return res.status(200).json({
        damageLiabilityAccepted: Boolean(damageLiability),
        vendorAgreementSigned: Boolean(vendorAgreement),
        currentAgreementVersion: latestVersion,
      });
    } catch (err) {
      next(err);
    }
  }

  // 11. GET /v1/internal/users/{id} (operationId: getInternalUser)
  async getInternalUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userRepository.findById(id);

      if (!user) {
        const err = new Error(`User ${id} not found`);
        err.code = 'NOT_FOUND';
        err.status = 404;
        err.details = [];
        return next(err);
      }

      const decryptedPhone = decrypt(user.phone_encrypted);

      return res.status(200).json({
        id: user.id,
        name: user.name,
        role: user.role,
        phone: decryptedPhone,
        email: user.email || null,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
