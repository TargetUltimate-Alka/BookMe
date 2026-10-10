const request = require('supertest');
const app = require('../../src/app');
const eventService = require('../../src/modules/event/services/eventService');
const budgetService = require('../../src/modules/event/services/budgetService');
const checklistService = require('../../src/modules/event/services/checklistService');
const suggestionService = require('../../src/modules/event/services/suggestionService');

jest.mock('../../src/modules/event/services/eventService');
jest.mock('../../src/modules/event/services/budgetService');
jest.mock('../../src/modules/event/services/checklistService');
jest.mock('../../src/modules/event/services/suggestionService');

describe('Event Module - Full Endpoint Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserHeaders = {
    'X-User-Id': 'usr_customer_1',
    'X-User-Role': 'customer',
  };

  describe('POST /events', () => {
    it('creates an event and returns 201 Created', async () => {
      const mockCreated = {
        id: 'evt_123',
        customer_id: 'usr_customer_1',
        name: 'Wedding Gala',
        event_type: 'Wedding',
        event_date: '2027-05-20',
        budget: 500000,
        guest_count: 200,
        status: 'PLANNING',
        budget_items: [{ category: 'Venue & Catering', planned_amount: 250000, actual_amount: 0 }],
        checklist_count: 8,
      };

      eventService.createEvent.mockResolvedValueOnce(mockCreated);

      const res = await request(app)
        .post('/events')
        .set(mockUserHeaders)
        .send({
          name: 'Wedding Gala',
          event_type: 'Wedding',
          event_date: '2027-05-20',
          budget: 500000,
          guest_count: 200,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('evt_123');
      expect(res.body.budget_items.length).toBe(1);
      expect(eventService.createEvent).toHaveBeenCalledWith('usr_customer_1', expect.any(Object));
    });
  });

  describe('GET /events', () => {
    it('returns paginated list of customer events (200 OK)', async () => {
      eventService.listEvents.mockResolvedValueOnce({
        data: [{ id: 'evt_123', name: 'Wedding Gala', budget: 500000, days_left: 100 }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const res = await request(app).get('/events').set(mockUserHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('GET /events/:id', () => {
    it('returns single event details (200 OK)', async () => {
      eventService.getEventById.mockResolvedValueOnce({
        id: 'evt_123',
        name: 'Wedding Gala',
        budget: 500000,
      });

      const res = await request(app).get('/events/evt_123').set(mockUserHeaders);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('evt_123');
    });

    it('returns 404 when event does not exist', async () => {
      const err = new Error('Event not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      eventService.getEventById.mockRejectedValueOnce(err);

      const res = await request(app).get('/events/non_existent').set(mockUserHeaders);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /events/:id', () => {
    it('updates event details (200 OK)', async () => {
      eventService.updateEvent.mockResolvedValueOnce({
        id: 'evt_123',
        name: 'Updated Gala',
        budget: 600000,
      });

      const res = await request(app)
        .put('/events/evt_123')
        .set(mockUserHeaders)
        .send({ name: 'Updated Gala', budget: 600000 });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Gala');
    });
  });

  describe('DELETE /events/:id', () => {
    it('soft cancels an event (200 OK)', async () => {
      eventService.cancelEvent.mockResolvedValueOnce({
        message: 'Event cancelled successfully',
        status: 'CANCELLED',
      });

      const res = await request(app).delete('/events/evt_123').set(mockUserHeaders);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
    });
  });

  describe('GET /events/:id/dashboard', () => {
    it('returns aggregated event dashboard (200 OK)', async () => {
      eventService.getDashboard.mockResolvedValueOnce({
        event: { id: 'evt_123', name: 'Wedding Gala', status: 'PLANNING' },
        progress: { percentage: 33.3, confirmed_categories: 1, total_budget_categories: 3 },
        budget: { total: 500000, planned: 500000, actual: 120000, remaining: 380000, overBudget: false },
        checklist: { total: 8, completed: 3, pending: 5, overdue: 0 },
        bookings: [],
      });

      const res = await request(app).get('/events/evt_123/dashboard').set(mockUserHeaders);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('progress');
      expect(res.body).toHaveProperty('budget');
      expect(res.body).toHaveProperty('checklist');
    });
  });

  describe('GET /events/:id/suggestions', () => {
    it('returns vendor and budgeting suggestions (200 OK)', async () => {
      suggestionService.getSuggestions.mockResolvedValueOnce({
        event_type: 'Wedding',
        suggested_categories: [{ category: 'Venue & Catering', percentage: 50 }],
        vendor_tips: ['Book early'],
      });

      const res = await request(app).get('/events/evt_123/suggestions').set(mockUserHeaders);

      expect(res.status).toBe(200);
      expect(res.body.event_type).toBe('Wedding');
    });
  });

  describe('GET /events/:id/budget and PUT /events/:id/budget', () => {
    it('GET returns budget summary (200 OK)', async () => {
      budgetService.getBudget.mockResolvedValueOnce({
        totalBudget: 500000,
        plannedTotal: 500000,
        actualTotal: 0,
        categories: [],
      });

      const res = await request(app).get('/events/evt_123/budget').set(mockUserHeaders);

      expect(res.status).toBe(200);
      expect(res.body.totalBudget).toBe(500000);
    });

    it('PUT updates budget categories and calculates plannedExceedsBudget (200 OK)', async () => {
      budgetService.updateBudget.mockResolvedValueOnce({
        totalBudget: 500000,
        plannedTotal: 550000,
        actualTotal: 0,
        plannedExceedsBudget: true,
        categories: [],
      });

      const res = await request(app)
        .put('/events/evt_123/budget')
        .set(mockUserHeaders)
        .send({
          categories: [{ category: 'Venue & Catering', planned_amount: 550000 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.plannedExceedsBudget).toBe(true);
    });
  });

  describe('Checklist Endpoints', () => {
    it('GET /events/:id/checklist returns tasks (200 OK)', async () => {
      checklistService.getChecklist.mockResolvedValueOnce([
        { id: 'chk_1', task: 'Book venue', done: false, is_overdue: false },
      ]);

      const res = await request(app).get('/events/evt_123/checklist').set(mockUserHeaders);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('POST /events/:id/checklist adds task (201 Created)', async () => {
      checklistService.addItem.mockResolvedValueOnce({
        id: 'chk_2',
        task: 'Send invitations',
        done: false,
      });

      const res = await request(app)
        .post('/events/evt_123/checklist')
        .set(mockUserHeaders)
        .send({ task: 'Send invitations' });

      expect(res.status).toBe(201);
      expect(res.body.task).toBe('Send invitations');
    });

    it('PUT /checklist/:id updates task (200 OK)', async () => {
      checklistService.updateItem.mockResolvedValueOnce({
        id: 'chk_1',
        task: 'Book venue',
        done: true,
      });

      const res = await request(app)
        .put('/checklist/chk_1')
        .set(mockUserHeaders)
        .send({ done: true });

      expect(res.status).toBe(200);
      expect(res.body.done).toBe(true);
    });

    it('DELETE /checklist/:id removes task (204 No Content)', async () => {
      checklistService.deleteItem.mockResolvedValueOnce({ success: true });

      const res = await request(app).delete('/checklist/chk_1').set(mockUserHeaders);

      expect(res.status).toBe(204);
    });
  });
});
