import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '../api/eventsApi.js';

export function useBudget(eventId) {
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchBudget = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await eventsApi.getEventBudget(eventId);
      setBudget(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const updateBudget = async (categories) => {
    setUpdating(true);
    try {
      const res = await eventsApi.updateEventBudget(eventId, { categories });
      setBudget(res);
      return res;
    } catch (err) {
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return {
    budget,
    loading,
    error,
    updating,
    refetch: fetchBudget,
    updateBudget,
  };
}
