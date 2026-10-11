import React from 'react';

/**
 * Status pill badge for bookings & events
 * SRS statuses: PENDING, ACCEPTED, CONFIRMED, COMPLETED, CANCELLED, REJECTED
 */
export function BookingStatusBadge({ status }) {
  if (!status) return null;

  const normalized = status.toUpperCase();

  const getStyleClass = () => {
    switch (normalized) {
      case 'PENDING':
        return 'eb-badge eb-badge-pending';
      case 'ACCEPTED':
        return 'eb-badge eb-badge-accepted';
      case 'CONFIRMED':
        return 'eb-badge eb-badge-confirmed';
      case 'COMPLETED':
        return 'eb-badge eb-badge-completed';
      case 'CANCELLED':
        return 'eb-badge eb-badge-cancelled';
      case 'REJECTED':
        return 'eb-badge eb-badge-rejected';
      case 'PLANNING':
        return 'eb-badge eb-badge-accepted';
      default:
        return 'eb-badge eb-badge-cancelled';
    }
  };

  return (
    <span className={getStyleClass()} title={`Status: ${normalized}`}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block',
        }}
      />
      {normalized}
    </span>
  );
}
