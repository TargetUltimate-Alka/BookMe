const axios = require('axios');
const config = require('../config');
const logger = require('../shared/logger');

/**
 * Mock Vendor Client for local development, deterministic tests, and standalone demo
 */
class MockVendorClient {
  constructor() {
    this.vendors = {
      vnd_456: {
        id: 'vnd_456',
        userId: 'usr_vendor_1',
        name: 'Sunset Catering',
        category: 'Catering',
        verified: true,
        active: true,
        services: {
          svc_789: {
            id: 'svc_789',
            title: 'Royal Wedding Buffet',
            packages: {
              pkg_111: { id: 'pkg_111', name: 'Gold Buffet Package', price: 120000 },
              pkg_112: { id: 'pkg_112', name: 'Platinum Buffet Package', price: 180000 },
            },
          },
        },
      },
      vnd_101: {
        id: 'vnd_101',
        userId: 'usr_vendor_2',
        name: 'Grand Palace Banquet',
        category: 'Venue & Catering',
        verified: true,
        active: true,
        services: {
          svc_101: {
            id: 'svc_101',
            title: 'Main Ballroom Hall',
            packages: {
              pkg_201: { id: 'pkg_201', name: 'Full Day Hall & Catering', price: 250000 },
            },
          },
        },
      },
      vnd_202: {
        id: 'vnd_202',
        userId: 'usr_vendor_3',
        name: 'LensCraft Studio',
        category: 'Photography & Video',
        verified: true,
        active: true,
        services: {
          svc_202: {
            id: 'svc_202',
            title: 'Wedding Cinematography',
            packages: {
              pkg_301: { id: 'pkg_301', name: 'Complete Photo & Video Package', price: 75000 },
            },
          },
        },
      },
    };

    // Calendar blocks: `${vendorId}:${date}` -> { bookingId, status: 'HELD' | 'BOOKED' }
    this.calendar = new Map();
  }

  async validate(vendorId, serviceId, packageId) {
    const vendor = this.vendors[vendorId];
    if (!vendor) {
      const err = new Error(`Vendor ${vendorId} not found`);
      err.status = 404;
      err.code = 'VENDOR_NOT_FOUND';
      throw err;
    }

    if (!vendor.verified || !vendor.active) {
      const err = new Error(`Vendor ${vendorId} is not active or verified`);
      err.status = 400;
      err.code = 'VENDOR_NOT_ACTIVE';
      throw err;
    }

    const service = vendor.services[serviceId];
    if (!service) {
      const err = new Error(`Service ${serviceId} not offered by vendor ${vendorId}`);
      err.status = 400;
      err.code = 'INVALID_SERVICE';
      throw err;
    }

    const pkg = service.packages[packageId];
    if (!pkg) {
      const err = new Error(`Package ${packageId} not found in service ${serviceId}`);
      err.status = 400;
      err.code = 'INVALID_PACKAGE';
      throw err;
    }

    return {
      valid: true,
      vendorName: vendor.name,
      packageName: pkg.name,
      price: pkg.price,
      category: vendor.category,
    };
  }

  async checkAvailability(vendorId, date) {
    const key = `${vendorId}:${date}`;
    const existing = this.calendar.get(key);

    if (existing) {
      return { available: false, date, reason: `Date already ${existing.status.toLowerCase()}` };
    }

    return { available: true, date };
  }

  async hold(vendorId, date, bookingId) {
    const key = `${vendorId}:${date}`;
    const existing = this.calendar.get(key);

    if (existing && existing.bookingId !== bookingId) {
      const err = new Error(`Date ${date} is already locked by another booking`);
      err.status = 409;
      err.code = 'VENDOR_UNAVAILABLE';
      throw err;
    }

    this.calendar.set(key, { bookingId, status: 'HELD', heldAt: new Date() });
    return { success: true, status: 'HELD', vendorId, date, bookingId };
  }

  async book(vendorId, date, bookingId) {
    const key = `${vendorId}:${date}`;
    this.calendar.set(key, { bookingId, status: 'BOOKED', bookedAt: new Date() });
    return { success: true, status: 'BOOKED', vendorId, date, bookingId };
  }

  async release(vendorId, date, bookingId) {
    const key = `${vendorId}:${date}`;
    const existing = this.calendar.get(key);

    if (existing && existing.bookingId === bookingId) {
      this.calendar.delete(key);
    }

    return { success: true, status: 'RELEASED', vendorId, date, bookingId };
  }

  async getVendorByUserId(userId) {
    for (const v of Object.values(this.vendors)) {
      if (v.userId === userId) {
        return v;
      }
    }
    // Default fallback vendor for dev testing
    return this.vendors.vnd_456;
  }

  async getVendorsByIds(ids = []) {
    return ids.map((id) => this.vendors[id] || { id, name: 'Vendor Partner' });
  }
}

/**
 * Real Vendor Client making outbound HTTP calls to vendor-service
 */
class RealVendorClient {
  constructor() {
    this.client = axios.create({
      baseURL: config.vendorServiceUrl,
      timeout: 5000,
      headers: {
        'X-Internal-Key': config.internalApiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async validate(vendorId, serviceId, packageId) {
    try {
      const res = await this.client.get(`/internal/vendors/${vendorId}/validate`, {
        params: { serviceId, packageId },
      });
      return res.data;
    } catch (err) {
      this.handleHttpError(err, 'vendor validation');
    }
  }

  async checkAvailability(vendorId, date) {
    try {
      const res = await this.client.get('/internal/availability/check', {
        params: { vendorId, date },
      });
      return res.data;
    } catch (err) {
      this.handleHttpError(err, 'availability check');
    }
  }

  async hold(vendorId, date, bookingId) {
    try {
      const res = await this.client.post('/internal/availability/hold', {
        vendorId,
        date,
        bookingId,
      });
      return res.data;
    } catch (err) {
      this.handleHttpError(err, 'availability hold');
    }
  }

  async book(vendorId, date, bookingId) {
    try {
      const res = await this.client.post('/internal/availability/book', {
        vendorId,
        date,
        bookingId,
      });
      return res.data;
    } catch (err) {
      this.handleHttpError(err, 'availability book');
    }
  }

  async release(vendorId, date, bookingId) {
    try {
      const res = await this.client.post('/internal/availability/release', {
        vendorId,
        date,
        bookingId,
      });
      return res.data;
    } catch (err) {
      this.handleHttpError(err, 'availability release');
    }
  }

  async getVendorByUserId(userId) {
    try {
      const res = await this.client.get('/vendors/me', {
        headers: { 'X-User-Id': userId },
      });
      return res.data;
    } catch (err) {
      this.handleHttpError(err, 'vendor lookup by user');
    }
  }

  async getVendorsByIds(ids = []) {
    try {
      const res = await this.client.get('/vendors', {
        params: { ids: ids.join(',') },
      });
      return res.data;
    } catch (err) {
      this.handleHttpError(err, 'vendors bulk lookup');
    }
  }

  handleHttpError(err, action) {
    logger.error(`Vendor service HTTP call failed on ${action}: ${err.message}`);
    if (err.response) {
      const error = new Error(err.response.data?.error?.message || err.response.data?.message || `Upstream vendor error during ${action}`);
      error.status = err.response.status;
      error.code = err.response.status === 409 ? 'VENDOR_UNAVAILABLE' : 'UPSTREAM_SERVICE_ERROR';
      throw error;
    }

    const gatewayError = new Error(`Vendor service unreachable during ${action}`);
    gatewayError.status = 502;
    gatewayError.code = 'UPSTREAM_SERVICE_ERROR';
    throw gatewayError;
  }
}

const vendorClient = config.vendorClientMode === 'real'
  ? new RealVendorClient()
  : new MockVendorClient();

module.exports = {
  vendorClient,
  MockVendorClient,
  RealVendorClient,
};
