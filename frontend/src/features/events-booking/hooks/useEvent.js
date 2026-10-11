import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '../api/eventsApi.js';

export function useEvent(id) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await eventsApi.getEventById(id);
      setEvent(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const updateEvent = async (payload) => {
    setActionLoading(true);
    try {
      const updated = await eventsApi.updateEvent(id, payload);
      setEvent(updated);
      return updated;
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const cancelEvent = async () => {
    setActionLoading(true);
    try {
      const result = await eventsApi.cancelEvent(id);
      setEvent((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      return result;
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    event,
    loading,
    error,
    actionLoading,
    refetch: fetchEvent,
    updateEvent,
    cancelEvent,
  };
}
