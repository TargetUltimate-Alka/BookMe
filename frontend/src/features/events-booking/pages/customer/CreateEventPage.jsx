import React, { useState } from 'react';
import { EventForm } from '../../components/EventForm.jsx';
import { eventsApi } from '../../api/eventsApi.js';

export function CreateEventPage({ onEventCreated, onNavigateBack }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const createdEvent = await eventsApi.createEvent(formData);
      if (onEventCreated) {
        onEventCreated(createdEvent);
      }
    } catch (err) {
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="eb-container">
      <div className="eb-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          {onNavigateBack && (
            <button
              type="button"
              className="eb-btn eb-btn-ghost eb-btn-sm"
              onClick={onNavigateBack}
              style={{ marginBottom: '0.5rem', paddingLeft: 0 }}
            >
              ⬅ Back to Events
            </button>
          )}
          <h1 className="eb-title">Create New Event</h1>
          <p className="eb-subtitle">
            Plan your event and let BookMe automatically suggest allocations and vendor checklists.
          </p>
        </div>
      </div>

      {error && (
        <div className="eb-alert-banner eb-alert-danger">
          <span>❌ <strong>Error creating event:</strong> {error.message}</span>
        </div>
      )}

      <EventForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
