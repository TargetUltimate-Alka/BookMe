import React, { useState } from 'react';
import { useEvents } from '../../hooks/useEvents.js';
import { EventCard } from '../../components/EventCard.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { eventsApi } from '../../api/eventsApi.js';
import { getDaysRemaining } from '../../utils/formatters.js';

export function MyEventsPage({ onCreateEvent, onSelectEvent }) {
  const [activeFilter, setActiveFilter] = useState('upcoming');
  const { events, loading, error, refetch } = useEvents();
  const [eventToCancel, setEventToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState('');

  const handleCancelConfirm = async () => {
    if (!eventToCancel) return;
    setCancelling(true);
    setActionError('');
    try {
      await eventsApi.cancelEvent(eventToCancel.id);
      setEventToCancel(null);
      refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to cancel event.');
    } finally {
      setCancelling(false);
    }
  };

  const filteredEvents = (events || []).filter((event) => {
    const daysLeft = event.days_left !== undefined ? event.days_left : getDaysRemaining(event.event_date);
    const isPast = daysLeft !== null && daysLeft < 0;

    if (activeFilter === 'upcoming') {
      return !isPast && event.status !== 'CANCELLED';
    }
    if (activeFilter === 'past') {
      return isPast || event.status === 'COMPLETED';
    }
    if (activeFilter === 'planning') {
      return event.status === 'PLANNING';
    }
    if (activeFilter === 'cancelled') {
      return event.status === 'CANCELLED';
    }
    return true; // 'all'
  });

  return (
    <div className="eb-container">
      {/* Page Header */}
      <div className="eb-header">
        <div>
          <h1 className="eb-title">My Events</h1>
          <p className="eb-subtitle">
            Manage your celebrations, budgets, vendor bookings, and milestone checklists.
          </p>
        </div>

        <div>
          {onCreateEvent && (
            <button
              type="button"
              className="eb-btn eb-btn-primary"
              onClick={onCreateEvent}
            >
              + Create New Event
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="eb-alert-banner eb-alert-danger">
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="eb-tabs">
        <button
          type="button"
          className={`eb-tab ${activeFilter === 'upcoming' ? 'eb-tab-active' : ''}`}
          onClick={() => setActiveFilter('upcoming')}
        >
          Upcoming
        </button>
        <button
          type="button"
          className={`eb-tab ${activeFilter === 'planning' ? 'eb-tab-active' : ''}`}
          onClick={() => setActiveFilter('planning')}
        >
          In Planning
        </button>
        <button
          type="button"
          className={`eb-tab ${activeFilter === 'past' ? 'eb-tab-active' : ''}`}
          onClick={() => setActiveFilter('past')}
        >
          Past Events
        </button>
        <button
          type="button"
          className={`eb-tab ${activeFilter === 'cancelled' ? 'eb-tab-active' : ''}`}
          onClick={() => setActiveFilter('cancelled')}
        >
          Cancelled
        </button>
        <button
          type="button"
          className={`eb-tab ${activeFilter === 'all' ? 'eb-tab-active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All ({events?.length || 0})
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <Spinner message="Loading your events..." />
      ) : error ? (
        <div className="eb-alert-banner eb-alert-danger">
          <span>Failed to load events: {error.message}</span>
          <button type="button" className="eb-btn eb-btn-secondary eb-btn-sm" onClick={refetch} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon="🎉"
          title={activeFilter === 'upcoming' ? 'No upcoming events' : 'No events found'}
          description={
            activeFilter === 'upcoming'
              ? 'You have no upcoming events scheduled. Start by creating an event to budget services and book vendors.'
              : 'There are no events matching the selected filter.'
          }
          actionText={onCreateEvent ? 'Create Your First Event' : null}
          onAction={onCreateEvent}
        />
      ) : (
        <div className="eb-grid eb-grid-3">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onViewDashboard={(id) => onSelectEvent && onSelectEvent(id)}
              onCancelEvent={(ev) => setEventToCancel(ev)}
            />
          ))}
        </div>
      )}

      {/* Cancel Event Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(eventToCancel)}
        onClose={() => setEventToCancel(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Event"
        message={`Are you sure you want to cancel "${eventToCancel?.name}"? This will set the event status to CANCELLED and cascade to any active vendor requests.`}
        confirmText="Yes, Cancel Event"
        confirmVariant="eb-btn-danger"
        loading={cancelling}
      />
    </div>
  );
}
