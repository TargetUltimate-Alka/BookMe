import React from 'react';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { BookingStatusBadge } from './BookingStatusBadge.jsx';

export function BookingCard({
  booking,
  onViewDetails,
  onPayNow,
  onCancel,
  onReview,
  onComplaint,
}) {
  if (!booking) return null;

  const vendorName = booking.vendor_name || booking.vendor_name_snapshot || 'Vendor';
  const packageName = booking.package_name || booking.package_name_snapshot || 'Custom Package';
  const amount = booking.amount !== undefined ? booking.amount : booking.price_snapshot;
  const status = booking.status ? booking.status.toUpperCase() : 'PENDING';

  return (
    <article className="eb-card eb-card-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="eb-card-header">
        <div>
          <span
            className="eb-badge"
            style={{ background: '#f3f4f6', color: '#4b5563', marginBottom: '0.4rem', border: '1px solid #e5e7eb' }}
          >
            {booking.category || 'Service'}
          </span>
          <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
            {vendorName}
          </h4>
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            Package: {packageName}
          </span>
        </div>
        <BookingStatusBadge status={status} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.75rem 0 1rem 0' }}>
        <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>
          📅 {formatDate(booking.booking_date)}
        </span>
        <strong style={{ fontSize: '1.1rem', color: '#4f46e5' }}>
          {formatCurrency(amount)}
        </strong>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.5rem' }}>
        {onViewDetails && (
          <button
            type="button"
            className="eb-btn eb-btn-secondary eb-btn-sm"
            style={{ flex: 1 }}
            onClick={() => onViewDetails(booking.id)}
          >
            Details
          </button>
        )}

        {status === 'ACCEPTED' && onPayNow && (
          <button
            type="button"
            className="eb-btn eb-btn-primary eb-btn-sm"
            style={{ flex: 1 }}
            onClick={() => onPayNow(booking)}
          >
            💳 Pay Now
          </button>
        )}

        {['PENDING', 'ACCEPTED', 'CONFIRMED'].includes(status) && onCancel && (
          <button
            type="button"
            className="eb-btn eb-btn-ghost eb-btn-sm"
            style={{ color: '#ef4444' }}
            onClick={() => onCancel(booking)}
          >
            Cancel
          </button>
        )}

        {status === 'COMPLETED' && onReview && (
          <button
            type="button"
            className="eb-btn eb-btn-secondary eb-btn-sm"
            onClick={() => onReview(booking)}
          >
            ⭐ Review
          </button>
        )}

        {['CONFIRMED', 'COMPLETED'].includes(status) && onComplaint && (
          <button
            type="button"
            className="eb-btn eb-btn-ghost eb-btn-sm"
            onClick={() => onComplaint(booking)}
          >
            Help
          </button>
        )}
      </div>
    </article>
  );
}
