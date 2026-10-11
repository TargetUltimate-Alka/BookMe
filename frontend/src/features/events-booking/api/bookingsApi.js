import { apiClient } from './client.js';

/**
 * Bookings API module
 */
export const bookingsApi = {
  /**
   * Create a booking request for an event
   * @param {{ event_id: string, vendor_id: string, service_id: string, package_id: string, category: string }} data
   */
  async createBooking(data) {
    return apiClient.post('/bookings', data);
  },

  /**
   * List customer bookings with optional filters
   * @param {{ event_id?: string, status?: string, page?: number, limit?: number }} params
   */
  async getBookings(params = {}) {
    const query = new URLSearchParams();
    if (params.event_id) query.append('event_id', params.event_id);
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString();
    return apiClient.get(`/bookings${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * List booking requests for the logged-in vendor
   * @param {{ status?: string, page?: number, limit?: number }} params
   */
  async getVendorBookings(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString();
    return apiClient.get(`/bookings/vendor${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get single booking details including status timeline
   * @param {string} id
   */
  async getBookingById(id) {
    return apiClient.get(`/bookings/${id}`);
  },

  /**
   * Vendor accepts a pending booking
   * @param {string} id
   */
  async acceptBooking(id) {
    return apiClient.patch(`/bookings/${id}/accept`);
  },

  /**
   * Vendor rejects a pending booking with reason
   * @param {string} id
   * @param {{ reason: string }} data
   */
  async rejectBooking(id, data) {
    return apiClient.patch(`/bookings/${id}/reject`, data);
  },

  /**
   * Cancel booking (Customer, Vendor, or Admin)
   * @param {string} id
   * @param {{ reason: string }} data
   */
  async cancelBooking(id, data) {
    return apiClient.patch(`/bookings/${id}/cancel`, data);
  },

  /**
   * Vendor marks confirmed booking as completed
   * @param {string} id
   */
  async completeBooking(id) {
    return apiClient.patch(`/bookings/${id}/complete`);
  },

  /**
   * Admin booking list
   * @param {{ status?: string, vendorId?: string, customerId?: string, page?: number, limit?: number }} params
   */
  async getAdminBookings(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.vendorId) query.append('vendorId', params.vendorId);
    if (params.customerId) query.append('customerId', params.customerId);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString();
    return apiClient.get(`/admin/bookings${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Admin booking details
   * @param {string} id
   */
  async getAdminBookingById(id) {
    return apiClient.get(`/admin/bookings/${id}`);
  },

  /**
   * Admin stats overview
   */
  async getAdminStats() {
    return apiClient.get('/admin/stats');
  },
};
