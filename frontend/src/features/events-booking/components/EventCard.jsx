import React from 'react';
import { formatCurrency, formatDate, getDaysRemaining } from '../utils/formatters.js';
import { BookingStatusBadge } from './BookingStatusBadge.jsx';

export function EventCard({ event, onViewDashboard, onCancelEvent }) {
  if (!event) return null;

  const daysLeft = event.days_left !== undefined ? event.days_left : getDaysRemaining(event.event_date);
  const isPast = daysLeft !== null && daysLeft < 0;

  return (
    <article className="eb-card eb-card-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="eb-card-header">
        <div>
          <span
            className="eb-badge"
            style={{ background: '#f3f4f6', color: '#4b5563', marginBottom: '0.4rem', border: '1px solid #e5e7eb' }}
          >
            {event.event_type}
          </span>
          <h3
            style={{
              margin: '0.25rem 0 0 0',
              fontSize: '1.2rem',
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1.3,
            }}
          >
            {event.name}
          </h3>
        </div>
        <BookingStatusBadge status={event.status || 'PLANNING'} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          📅 {formatDate(event.event_date)}
        </span>
        {event.city && (
          <span style={{ fontSize: '0.85rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            📍 {event.city}
          </span>
        )}
        {event.guest_count && (
          <span style={{ fontSize: '0.85rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            👥 {event.guest_count} guests
          </span>
        )}
      </div>

      <div
        style={{
          background: '#f9fafb',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          border: '1px solid #f3f4f6',
        }}
      >
        <div>
          <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
            Budget
          </span>
          <strong style={{ fontSize: '1.1rem', color: '#111827' }}>
            {formatCurrency(event.budget)}
          </strong>
        </div>

        <div>
          {daysLeft !== null && (
            <span
              className={`eb-badge ${isPast ? 'eb-badge-cancelled' : 'eb-badge-days'}`}
              style={{ fontSize: '0.75rem' }}
            >
              {isPast ? 'Event ended' : `${daysLeft} days left`}
            </span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="eb-btn eb-btn-primary"
          style={{ flex: 1 }}
          onClick={() => onViewDashboard && onViewDashboard(event.id)}
        >
          View Dashboard
        </button>

        {event.status !== 'CANCELLED' && onCancelEvent && (
          <button
            type="button"
            className="eb-btn eb-btn-ghost eb-btn-sm"
            onClick={() => onCancelEvent(event)}
            title="Cancel event"
            style={{ color: '#ef4444' }}
          >
            Cancel
          </button>
        )}
      </div>
    </article>
  );
}
