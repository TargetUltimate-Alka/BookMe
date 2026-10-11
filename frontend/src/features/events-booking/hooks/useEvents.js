import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '../api/eventsApi.js';

export function useEvents(filters = {}) {
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filterStatus = filters.status;
  const page = filters.page || 1;
  const limit = filters.limit || 20;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await eventsApi.getEvents({ status: filterStatus, page, limit });
      setEvents(res.data || []);
      setMeta(res.meta || { total: res.data?.length || 0, page, limit, totalPages: 1 });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, page, limit]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    meta,
    loading,
    error,
    refetch: fetchEvents,
  };
}
