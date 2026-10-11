import React, { useState } from 'react';
import { useBooking } from '../../hooks/useBooking.js';
import { useBookingActions } from '../../hooks/useBookingActions.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { BookingStatusBadge } from '../../components/BookingStatusBadge.jsx';
import { BookingTimeline } from '../../components/BookingTimeline.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { Spinner } from '../../components/Spinner.jsx';

export function AdminBookingDetailsPage({ bookingId, onNavigateBack }) {
  const { booking, loading, error, refetch } = useBooking(bookingId, true);
  const { cancelBooking, actionLoading } = useBookingActions();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [banner, setBanner] = useState('');

  if (loading) {
    return (
      <div className="eb-container">
        <Spinner message="Loading admin booking audit..." />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="eb-container">
        <div className="eb-alert-banner eb-alert-danger">
          <span>Failed to load booking: {error?.message || 'Booking not found'}</span>
        </div>
        {onNavigateBack && (
          <button type="button" className="eb-btn eb-btn-secondary" onClick={onNavigateBack}>
            ⬅ Back to Admin Bookings
          </button>
        )}
      </div>
    );
  }

  const status = (booking.status || 'PENDING').toUpperCase();
  const amount = booking.amount !== undefined ? booking.amount : booking.price_snapshot;

  const handleAdminCancel = async (reason) => {
    try {
      await cancelBooking(booking.id, `[ADMIN INTERVENTION] ${reason}`);
      setBanner('Booking was force-cancelled by admin authority.');
      setIsCancelOpen(false);
      refetch();
    } catch (err) {
      alert(`Admin cancellation failed: ${err.message}`);
    }
  };

  return (
    <div className="eb-container">
      {onNavigateBack && (
        <button
          type="button"
          className="eb-btn eb-btn-ghost eb-btn-sm"
          onClick={onNavigateBack}
          style={{ paddingLeft: 0, marginBottom: '1rem' }}
        >
          ⬅ Back to Admin Bookings
        </button>
      )}

      {banner && (
        <div className="eb-alert-banner eb-alert-success" style={{ marginBottom: '1.25rem' }}>
          <span>{banner}</span>
          <button
            type="button"
            className="eb-btn eb-btn-ghost eb-btn-sm"
            onClick={() => setBanner('')}
            style={{ marginLeft: 'auto' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="eb-card" style={{ marginBottom: '1.5rem' }}>
        <div className="eb-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className="eb-badge" style={{ background: '#f3f4f6', color: '#4b5563' }}>
                Admin Audit Mode
              </span>
              <BookingStatusBadge status={status} />
            </div>
            <h1 className="eb-title" style={{ fontSize: '1.75rem' }}>
              Booking #{booking.id}
            </h1>
            <p className="eb-subtitle">
              Event Date: 📅 {formatDate(booking.booking_date)} &bull; Created: {formatDate(booking.created_at)}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
              Total Volume
            </span>
            <strong style={{ fontSize: '1.6rem', color: '#4f46e5' }}>
              {formatCurrency(amount)}
            </strong>
          </div>
        </div>

        {/* Admin Action Controls */}
        {status !== 'CANCELLED' && status !== 'COMPLETED' && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
            <button
              type="button"
              className="eb-btn eb-btn-danger eb-btn-sm"
              onClick={() => setIsCancelOpen(true)}
              disabled={actionLoading}
            >
              ⚠️ Force Cancel Contract (Admin)
            </button>
          </div>
        )}
      </div>

      <div className="eb-grid eb-grid-2">
        {/* Left Column: Comprehensive Entity Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="eb-card">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
              Entity References & Snapshots
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Customer ID:</span>
                <code>{booking.customer_id}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Vendor ID:</span>
                <code>{booking.vendor_id}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Event ID:</span>
                <code>{booking.event_id}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Vendor Name Snapshot:</span>
                <strong>{booking.vendor_name_snapshot || 'N/A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Package Snapshot:</span>
                <span>{booking.package_name_snapshot || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Category:</span>
                <span>{booking.category || 'N/A'}</span>
              </div>
              {booking.cancellation_reason && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid #fee2e2', paddingTop: '0.5rem' }}>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>Cancellation Reason:</span>
                  <div style={{ background: '#fef2f2', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                    {booking.cancellation_reason}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Full Audit Trail */}
        <div className="eb-card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
            State Transition Audit Trail
          </h3>
          <BookingTimeline history={booking.history || []} />
        </div>
      </div>

      {/* Force Cancel Confirmation */}
      <ConfirmDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleAdminCancel}
        title="Admin Override: Force Cancel Booking"
        message="This action will unilaterally terminate the contract, record an admin audit event, and notify upstream services."
        confirmText="Execute Admin Force Cancel"
        confirmVariant="eb-btn-danger"
        requireReason={true}
        reasonPlaceholder="Mandatory admin intervention rationale..."
        loading={actionLoading}
      />
    </div>
  );
}
