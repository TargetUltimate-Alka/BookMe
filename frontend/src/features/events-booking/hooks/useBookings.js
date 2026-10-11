import { useState, useEffect, useCallback } from 'react';
import { bookingsApi } from '../api/bookingsApi.js';

export function useBookings(options = {}) {
  const [bookings, setBookings] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { eventId, status, type = 'customer', page = 1, limit = 20, vendorId, customerId } = options;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (type === 'vendor') {
        res = await bookingsApi.getVendorBookings({ status, page, limit });
      } else if (type === 'admin') {
        res = await bookingsApi.getAdminBookings({ status, vendorId, customerId, page, limit });
      } else {
        // Customer bookings
        res = await bookingsApi.getBookings({ event_id: eventId, status, page, limit });
      }

      const list = res.data || (Array.isArray(res) ? res : []);
      setBookings(list);
      setMeta(res.meta || { total: list.length, page, limit, totalPages: 1 });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [eventId, status, type, page, limit, vendorId, customerId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    meta,
    loading,
    error,
    refetch: fetchBookings,
  };
}
