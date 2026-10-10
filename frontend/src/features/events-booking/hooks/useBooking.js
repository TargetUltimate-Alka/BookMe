import { useState, useEffect, useCallback } from 'react';
import { bookingsApi } from '../api/bookingsApi.js';

export function useBooking(bookingId, isAdmin = false) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(Boolean(bookingId));
  const [error, setError] = useState(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const data = isAdmin
        ? await bookingsApi.getAdminBookingById(bookingId)
        : await bookingsApi.getBookingById(bookingId);
      setBooking(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [bookingId, isAdmin]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  return {
    booking,
    loading,
    error,
    refetch: fetchBooking,
  };
}
