import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export function BookingConfirmationPage({
  booking,
  onNavigateToBookings,
  onNavigateToEvents,
}) {
  if (!booking) {
    return (
      <div className="eb-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>Payment Processed</h2>
        <p style={{ color: '#6b7280' }}>Your booking has been confirmed.</p>
        {onNavigateToBookings && (
          <button type="button" className="eb-btn eb-btn-primary" onClick={onNavigateToBookings}>
            View Bookings
          </button>
        )}
      </div>
    );
  }

  const vendorName = booking.vendor_name || booking.vendor_name_snapshot || 'Vendor';
  const packageName = booking.package_name || booking.package_name_snapshot || 'Service Package';
  const amount = booking.amount !== undefined ? booking.amount : booking.price_snapshot;

  return (
    <div className="eb-container" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="eb-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#dcfce7',
            color: '#16a34a',
            fontSize: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
          }}
        >
          ✓
        </div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem 0' }}>
          Booking Confirmed!
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: '0 0 1.5rem 0' }}>
          Your payment was processed successfully. The vendor's calendar has been reserved.
        </p>

        <div
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            fontSize: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Booking Reference:</span>
            <code>{booking.id}</code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Vendor:</span>
            <strong>{vendorName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Package:</span>
            <span>{packageName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Event Date:</span>
            <span>{formatDate(booking.booking_date)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem' }}>
            <span style={{ color: '#111827', fontWeight: 600 }}>Amount Paid:</span>
            <strong style={{ color: '#16a34a', fontSize: '1.2rem' }}>
              {formatCurrency(amount)}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          {onNavigateToBookings && (
            <button type="button" className="eb-btn eb-btn-primary" onClick={onNavigateToBookings}>
              View All Bookings
            </button>
          )}
          {onNavigateToEvents && (
            <button type="button" className="eb-btn eb-btn-secondary" onClick={onNavigateToEvents}>
              Back to Events
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
