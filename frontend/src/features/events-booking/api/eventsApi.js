import { apiClient } from './client.js';

/**
 * Events API module
 */
export const eventsApi = {
  /**
   * Create a new event with automatic default budget & checklist generation
   * @param {{ name: string, event_type: string, event_date: string, budget: number, guest_count: number, city: string }} data
   */
  async createEvent(data) {
    return apiClient.post('/events', data);
  },

  /**
   * List customer's events with optional status filter and pagination
   * @param {{ status?: string, page?: number, limit?: number }} params
   */
  async getEvents(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString();
    return apiClient.get(`/events${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get single event details
   * @param {string} id
   */
  async getEventById(id) {
    return apiClient.get(`/events/${id}`);
  },

  /**
   * Update an existing event
   * @param {string} id
   * @param {object} data
   */
  async updateEvent(id, data) {
    return apiClient.put(`/events/${id}`, data);
  },

  /**
   * Soft-cancel an event (transitions status to CANCELLED)
   * @param {string} id
   */
  async cancelEvent(id) {
    return apiClient.delete(`/events/${id}`);
  },

  /**
   * Get AI / template suggestions for vendor categories and budget split
   * @param {string} id
   */
  async getEventSuggestions(id) {
    return apiClient.get(`/events/${id}/suggestions`);
  },

  /**
   * Get planned vs actual budget breakdown
   * @param {string} id
   */
  async getEventBudget(id) {
    return apiClient.get(`/events/${id}/budget`);
  },

  /**
   * Update planned budget categories
   * @param {string} id
   * @param {{ categories: Array<{ category: string, planned_amount: number }> }} data
   */
  async updateEventBudget(id, data) {
    return apiClient.put(`/events/${id}/budget`, data);
  },

  /**
   * Get checklist items for event
   * @param {string} id
   */
  async getEventChecklist(id) {
    return apiClient.get(`/events/${id}/checklist`);
  },

  /**
   * Add a custom checklist task to an event
   * @param {string} id
   * @param {{ task: string, category?: string, due_date?: string }} data
   */
  async addChecklistItem(id, data) {
    return apiClient.post(`/events/${id}/checklist`, data);
  },

  /**
   * Update/toggle a checklist item
   * @param {string} checklistId
   * @param {{ done?: boolean, task?: string, due_date?: string }} data
   */
  async updateChecklistItem(checklistId, data) {
    return apiClient.put(`/checklist/${checklistId}`, data);
  },

  /**
   * Delete a checklist task
   * @param {string} checklistId
   */
  async deleteChecklistItem(checklistId) {
    return apiClient.delete(`/checklist/${checklistId}`);
  },

  /**
   * Aggregated event dashboard data
   * @param {string} id
   */
  async getEventDashboard(id) {
    return apiClient.get(`/events/${id}/dashboard`);
  },
};
