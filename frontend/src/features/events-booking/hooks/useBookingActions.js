import { useState } from 'react';
import { bookingsApi } from '../api/bookingsApi.js';

export function useBookingActions() {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const createBooking = async (data) => {
    setActionLoading(true);
    setActionError(null);
    try {
      return await bookingsApi.createBooking(data);
    } catch (err) {
      setActionError(err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const acceptBooking = async (id) => {
    setActionLoading(true);
    setActionError(null);
    try {
      return await bookingsApi.acceptBooking(id);
    } catch (err) {
      setActionError(err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const rejectBooking = async (id, reason) => {
    setActionLoading(true);
    setActionError(null);
    try {
      return await bookingsApi.rejectBooking(id, { reason });
    } catch (err) {
      setActionError(err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const cancelBooking = async (id, reason) => {
    setActionLoading(true);
    setActionError(null);
    try {
      return await bookingsApi.cancelBooking(id, { reason });
    } catch (err) {
      setActionError(err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const completeBooking = async (id) => {
    setActionLoading(true);
    setActionError(null);
    try {
      return await bookingsApi.completeBooking(id);
    } catch (err) {
      setActionError(err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    actionLoading,
    actionError,
    createBooking,
    acceptBooking,
    rejectBooking,
    cancelBooking,
    completeBooking,
  };
}
