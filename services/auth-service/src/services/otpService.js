const crypto = require('crypto');
const config = require('../config');
const { hashPhone } = require('./encryptionService');
const otpRepository = require('../repository/otpRepository');
const userRepository = require('../repository/userRepository');
const { defaultSmsSender } = require('./smsSender');

const PHONE_REGEX = /^\+91[0-9]{10}$/;
const OTP_REGEX = /^[0-9]{6}$/;

class OtpService {
  async sendOtp(phone) {
    if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone.trim())) {
      const err = new Error('Invalid phone number format. Must start with +91 followed by 10 digits.');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      err.details = [{ field: 'phone', issue: 'Must match pattern ^\\+91[0-9]{10}$' }];
      throw err;
    }

    const cleanPhone = phone.trim();
    const phoneHash = hashPhone(cleanPhone);

    // 1. Check phone lockout status (FR-ONB-01)
    const phoneLockout = await otpRepository.getPhoneLockout(phoneHash);
    if (phoneLockout && phoneLockout.locked_until && new Date(phoneLockout.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(phoneLockout.locked_until) - new Date()) / 60000);
      const err = new Error(`Account locked due to multiple failed attempts. Please try again after ${remainingMinutes} minutes.`);
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      err.details = [{ field: 'phone', issue: 'Account locked due to 5 failed attempts' }];
      throw err;
    }

    // 2. Check user lockout status if user exists
    const existingUser = await userRepository.findByPhoneHash(phoneHash);
    if (existingUser && existingUser.locked_until && new Date(existingUser.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(existingUser.locked_until) - new Date()) / 60000);
      const err = new Error(`Account locked due to multiple failed attempts. Please try again after ${remainingMinutes} minutes.`);
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      err.details = [{ field: 'phone', issue: 'Account locked due to 5 failed attempts' }];
      throw err;
    }

    // 3. Check resend cooldown
    const latestOtp = await otpRepository.getLatestActiveOtp(phoneHash);
    if (latestOtp && latestOtp.cooldown_until && new Date(latestOtp.cooldown_until) > new Date()) {
      const retrySeconds = Math.ceil((new Date(latestOtp.cooldown_until) - new Date()) / 1000);
      const err = new Error(`Please wait ${retrySeconds} seconds before requesting a new OTP.`);
      err.code = 'RATE_LIMIT_EXCEEDED';
      err.status = 429;
      err.retryAfter = retrySeconds;
      err.details = [{ field: 'phone', issue: 'Cooldown active' }];
      throw err;
    }

    // 4. Generate secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const expiresAt = new Date(Date.now() + config.otpExpirySeconds * 1000);
    const cooldownUntil = new Date(Date.now() + config.otpCooldownSeconds * 1000);

    await otpRepository.saveOtp({
      phoneHash,
      otpHash,
      expiresAt,
      cooldownUntil,
    });

    // 5. Dispatch SMS via configured sender
    await defaultSmsSender.sendOtp(cleanPhone, rawOtp);

    // Anti-enumeration: returns identical response regardless of registration state
    return {
      success: true,
      expiresInSeconds: config.otpExpirySeconds,
    };
  }

  async verifyOtp(phone, otp) {
    if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone.trim())) {
      const err = new Error('Invalid phone number format.');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      err.details = [{ field: 'phone', issue: 'Must match pattern ^\\+91[0-9]{10}$' }];
      throw err;
    }

    if (!otp || typeof otp !== 'string' || !OTP_REGEX.test(otp.trim())) {
      const err = new Error('OTP must be a 6-digit number.');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      err.details = [{ field: 'otp', issue: 'Must match pattern ^[0-9]{6}$' }];
      throw err;
    }

    const cleanPhone = phone.trim();
    const cleanOtp = otp.trim();
    const phoneHash = hashPhone(cleanPhone);

    // 1. Check phone lockout
    const phoneLockout = await otpRepository.getPhoneLockout(phoneHash);
    if (phoneLockout && phoneLockout.locked_until && new Date(phoneLockout.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(phoneLockout.locked_until) - new Date()) / 60000);
      const err = new Error(`Account locked after 5 failed attempts. Please try again after ${remainingMinutes} minutes.`);
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      err.details = [{ field: 'phone', issue: 'Account locked' }];
      throw err;
    }

    // 2. Check user lockout
    const user = await userRepository.findByPhoneHash(phoneHash);
    if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      const err = new Error(`Account locked after 5 failed attempts. Please try again after ${remainingMinutes} minutes.`);
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      err.details = [{ field: 'phone', issue: 'Account locked' }];
      throw err;
    }

    const latestOtp = await otpRepository.getLatestActiveOtp(phoneHash);

    // 3. Missing, expired, or already consumed OTP
    if (!latestOtp || latestOtp.consumed || new Date(latestOtp.expires_at) < new Date()) {
      const pLockout = await otpRepository.recordFailedOtpAttempt(
        phoneHash,
        config.otpLockoutMinutes,
        config.otpMaxAttempts
      );
      if (user) {
        await userRepository.incrementFailedAttempts(user.id, config.otpLockoutMinutes, config.otpMaxAttempts);
      }
      if (pLockout && pLockout.failed_attempts >= config.otpMaxAttempts) {
        const err = new Error('Account locked after 5 failed attempts for 15 minutes.');
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        err.details = [{ field: 'otp', issue: 'Account locked after 5 failed attempts' }];
        throw err;
      }
      const err = new Error('Invalid or expired OTP.');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      err.details = [{ field: 'otp', issue: 'Invalid or expired OTP' }];
      throw err;
    }

    // 4. Verify OTP hash
    const inputHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (latestOtp.otp_hash !== inputHash) {
      await otpRepository.incrementFailedAttempts(latestOtp.id);
      const pLockout = await otpRepository.recordFailedOtpAttempt(
        phoneHash,
        config.otpLockoutMinutes,
        config.otpMaxAttempts
      );
      if (user) {
        await userRepository.incrementFailedAttempts(
          user.id,
          config.otpLockoutMinutes,
          config.otpMaxAttempts
        );
      }

      if (pLockout && pLockout.failed_attempts >= config.otpMaxAttempts) {
        const err = new Error('Invalid OTP. Account locked after 5 failed attempts for 15 minutes.');
        err.code = 'VALIDATION_ERROR';
        err.status = 400;
        err.details = [{ field: 'otp', issue: 'Account locked after 5 failed attempts' }];
        throw err;
      }

      const err = new Error('Invalid OTP.');
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      err.details = [{ field: 'otp', issue: 'Incorrect OTP entered' }];
      throw err;
    }

    // 5. OTP is valid! Mark consumed (single use) and reset failed counters
    await otpRepository.markConsumed(latestOtp.id);
    await otpRepository.resetPhoneLockout(phoneHash);

    if (user) {
      await userRepository.resetFailedAttempts(user.id);
    }

    // 6. Issue verification token for registration (expires in 15 minutes)
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const verificationToken = await otpRepository.createVerificationToken({
      phoneHash,
      expiresAt: tokenExpiresAt,
    });

    return {
      verified: true,
      verificationToken,
    };
  }
}

module.exports = new OtpService();
