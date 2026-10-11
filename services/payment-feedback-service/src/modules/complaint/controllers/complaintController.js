const complaintRepository = require('../repository/complaintRepository');
const logger = require('../../../shared/logger');
const crypto = require('crypto');

class ComplaintController {
  async createComplaint(req, res, next) {
    try {
      const { bookingId, subject, description } = req.body;
      const customerId = req.user?.id || 'usr_123';

      if (!bookingId || !subject || !description) {
        const err = new Error('bookingId, subject, and description are required');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      const id = `cmp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const complaint = {
        id,
        booking_id: bookingId,
        bookingId,
        customer_id: customerId,
        customerId,
        subject,
        description,
        status: 'open',
        created_at: new Date().toISOString(),
      };

      const saved = await complaintRepository.saveComplaint(complaint);
      logger.info(`Complaint filed: ${id} for booking ${bookingId}`);

      res.status(201).json({
        id: saved.id,
        status: saved.status,
        subject: saved.subject,
        bookingId: saved.booking_id || saved.bookingId,
        createdAt: saved.created_at,
      });
    } catch (err) {
      next(err);
    }
  }

  async getComplaints(req, res, next) {
    try {
      const { status } = req.query;
      const list = await complaintRepository.findList(status);

      const formatted = list.map((c) => ({
        id: c.id,
        subject: c.subject,
        description: c.description,
        status: c.status,
        bookingId: c.booking_id || c.bookingId,
        customerId: c.customer_id || c.customerId,
        createdAt: c.created_at,
      }));

      res.status(200).json(formatted);
    } catch (err) {
      next(err);
    }
  }

  async getComplaintById(req, res, next) {
    try {
      const complaint = await complaintRepository.findById(req.params.id);
      if (!complaint) {
        const err = new Error(`Complaint ${req.params.id} not found`);
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      res.status(200).json({
        id: complaint.id,
        bookingId: complaint.booking_id || complaint.bookingId,
        customerId: complaint.customer_id || complaint.customerId,
        subject: complaint.subject,
        description: complaint.description,
        status: complaint.status,
        createdAt: complaint.created_at,
        updatedAt: complaint.updated_at,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateComplaintStatus(req, res, next) {
    try {
      const { status } = req.body;
      if (!status) {
        const err = new Error('status is required');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      const complaint = await complaintRepository.findById(req.params.id);
      if (!complaint) {
        const err = new Error(`Complaint ${req.params.id} not found`);
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      complaint.status = status;
      complaint.updated_at = new Date().toISOString();
      const updated = await complaintRepository.saveComplaint(complaint);

      res.status(200).json({
        id: updated.id,
        subject: updated.subject,
        status: updated.status,
        updatedAt: updated.updated_at,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ComplaintController();
