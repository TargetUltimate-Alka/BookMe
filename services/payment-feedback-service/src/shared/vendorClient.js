const config = require('../config');
const logger = require('./logger');

class VendorClient {
  constructor() {
    this.baseUrl = config.vendorServiceUrl.replace(/\/$/, '');
    this.apiKey = config.internalApiKey;
  }

  async updateVendorRating(vendorId, rating) {
    try {
      const url = `${this.baseUrl}/internal/vendors/${vendorId}/rating`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'X-Internal-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating: Number(rating) }),
      });

      if (!res.ok) {
        logger.warn(`Failed to sync vendor rating to vendor-service: HTTP ${res.status}`);
        return false;
      }
      logger.info(`Successfully synced rating ${rating} for vendor ${vendorId}`);
      return true;
    } catch (err) {
      logger.warn(`Could not sync rating to vendor-service: ${err.message}`);
      return false;
    }
  }
}

module.exports = new VendorClient();
