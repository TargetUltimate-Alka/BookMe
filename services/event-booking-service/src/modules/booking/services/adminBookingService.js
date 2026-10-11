const bookingRepository = require('../repository/bookingRepository');
const historyRepository = require('../repository/historyRepository');

class AdminBookingService {
  async listAllBookings(query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const filter = {
      status: query.status || null,
      vendorId: query.vendorId || query.vendor_id || null,
      customerId: query.customerId || query.customer_id || null,
    };

    const [bookings, total] = await Promise.all([
      bookingRepository.findAll(filter, limit, offset),
      bookingRepository.countAll(filter),
    ]);

    return {
      data: bookings.map((b) => ({
        ...b,
        price_snapshot: Number(b.price_snapshot),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getAdminBookingDetails(bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const history = await historyRepository.findByBookingId(bookingId);

    return {
      ...booking,
      price_snapshot: Number(booking.price_snapshot),
      history,
    };
  }

  async getStats() {
    return bookingRepository.getPlatformStats();
  }
}

module.exports = new AdminBookingService();
