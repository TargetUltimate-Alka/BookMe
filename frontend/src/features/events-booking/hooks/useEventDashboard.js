import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '../api/eventsApi.js';

export function useEventDashboard(eventId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await eventsApi.getEventDashboard(eventId);
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    dashboard: data,
    loading,
    error,
    refetch: fetchDashboard,
  };
}
