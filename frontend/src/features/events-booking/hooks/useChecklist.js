import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '../api/eventsApi.js';

export function useChecklist(eventId) {
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchChecklist = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await eventsApi.getEventChecklist(eventId);
      setChecklist(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // Optimistic toggle for checklist items
  const toggleItem = async (itemId) => {
    const previousChecklist = [...checklist];
    const targetItem = checklist.find((item) => item.id === itemId);
    if (!targetItem) return;

    const newDoneState = !targetItem.done;

    // Apply optimistic update immediately
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, done: newDoneState } : item
      )
    );

    try {
      const updated = await eventsApi.updateChecklistItem(itemId, { done: newDoneState });
      setChecklist((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, ...updated } : item))
      );
    } catch (err) {
      // Revert optimistic update on error
      setChecklist(previousChecklist);
      throw err;
    }
  };

  const addItem = async ({ task, category, due_date }) => {
    setActionLoading(true);
    try {
      const created = await eventsApi.addChecklistItem(eventId, { task, category, due_date });
      setChecklist((prev) => [...prev, created]);
      return created;
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const updateItem = async (itemId, data) => {
    setActionLoading(true);
    try {
      const updated = await eventsApi.updateChecklistItem(itemId, data);
      setChecklist((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, ...updated } : item))
      );
      return updated;
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteItem = async (itemId) => {
    setActionLoading(true);
    try {
      await eventsApi.deleteChecklistItem(itemId);
      setChecklist((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    checklist,
    loading,
    error,
    actionLoading,
    refetch: fetchChecklist,
    toggleItem,
    addItem,
    updateItem,
    deleteItem,
  };
}
