const { maskPhone } = require('./encryptionService');

/**
 * SmsSender interface
 */
class SmsSender {
  async sendOtp(phone, otp) {
    throw new Error('SmsSender.sendOtp must be implemented by concrete class');
  }
}

/**
 * Console/Mock implementation for development and testing
 */
class ConsoleSmsSender extends SmsSender {
  constructor() {
    super();
    this.sentMessages = [];
  }

  async sendOtp(phone, otp) {
    const masked = maskPhone(phone);
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[SMS-MOCK] OTP for ${masked}: ${otp} (expires per config)`);
    }
    this.sentMessages.push({
      phone,
      masked,
      otp,
      sentAt: new Date().toISOString(),
    });
    return { success: true };
  }

  getSentMessages() {
    return this.sentMessages;
  }

  clear() {
    this.sentMessages = [];
  }
}

const defaultSmsSender = new ConsoleSmsSender();

module.exports = {
  SmsSender,
  ConsoleSmsSender,
  defaultSmsSender,
};
