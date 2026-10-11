import React, { useState } from 'react';
import { useBooking } from '../../hooks/useBooking.js';
import { useBookingActions } from '../../hooks/useBookingActions.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { BookingStatusBadge } from '../../components/BookingStatusBadge.jsx';
import { BookingTimeline } from '../../components/BookingTimeline.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { Spinner } from '../../components/Spinner.jsx';

export function VendorRequestDetailsPage({ bookingId, onNavigateBack }) {
  const { booking, loading, error, refetch } = useBooking(bookingId);
  const { acceptBooking, rejectBooking, completeBooking, actionLoading } = useBookingActions();

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  if (loading) {
    return (
      <div className="eb-container">
        <Spinner message="Loading request details..." />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="eb-container">
        <div className="eb-alert-banner eb-alert-danger">
          <span>Failed to load request: {error?.message || 'Request not found'}</span>
        </div>
        {onNavigateBack && (
          <button type="button" className="eb-btn eb-btn-secondary" onClick={onNavigateBack}>
            ⬅ Back to Requests
          </button>
        )}
      </div>
    );
  }

  const status = (booking.status || 'PENDING').toUpperCase();
  const amount = booking.amount !== undefined ? booking.amount : booking.price_snapshot;

  // Check if today is on or after the event date for completing
  const today = new Date().toISOString().split('T')[0];
  const bookingDateStr = booking.booking_date ? booking.booking_date.split('T')[0] : '';
  const canComplete = today >= bookingDateStr;

  const handleAccept = async () => {
    try {
      await acceptBooking(booking.id);
      setSuccessBanner('Booking accepted! Customer payment window opened.');
      refetch();
    } catch (err) {
      alert(`Error accepting booking: ${err.message}`);
    }
  };

  const handleReject = async (reason) => {
    try {
      await rejectBooking(booking.id, reason);
      setSuccessBanner('Booking request rejected.');
      setIsRejectOpen(false);
      refetch();
    } catch (err) {
      alert(`Error rejecting booking: ${err.message}`);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this booking contract as successfully completed?')) return;
    try {
      await completeBooking(booking.id);
      setSuccessBanner('Booking marked as completed!');
      refetch();
    } catch (err) {
      alert(`Error completing booking: ${err.message}`);
    }
  };

  const isConfirmedOrCompleted = ['CONFIRMED', 'COMPLETED'].includes(status);

  return (
    <div className="eb-container">
      {onNavigateBack && (
        <button
          type="button"
          className="eb-btn eb-btn-ghost eb-btn-sm"
          onClick={onNavigateBack}
          style={{ paddingLeft: 0, marginBottom: '1rem' }}
        >
          ⬅ Back to Requests
        </button>
      )}

      {successBanner && (
        <div className="eb-alert-banner eb-alert-success" style={{ marginBottom: '1.25rem' }}>
          <span>{successBanner}</span>
          <button
            type="button"
            className="eb-btn eb-btn-ghost eb-btn-sm"
            onClick={() => setSuccessBanner('')}
            style={{ marginLeft: 'auto' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="eb-card" style={{ marginBottom: '1.5rem' }}>
        <div className="eb-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className="eb-badge" style={{ background: '#f3f4f6', color: '#4b5563' }}>
                {booking.category || 'Service Request'}
              </span>
              <BookingStatusBadge status={status} />
            </div>
            <h1 className="eb-title" style={{ fontSize: '1.75rem' }}>
              Request #{booking.id.slice(0, 8)}
            </h1>
            <p className="eb-subtitle">
              Requested for: 📅 <strong>{formatDate(booking.booking_date)}</strong>
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
              Contract Fee
            </span>
            <strong style={{ fontSize: '1.6rem', color: '#4f46e5' }}>
              {formatCurrency(amount)}
            </strong>
          </div>
        </div>

        {/* Vendor Action Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
          {status === 'PENDING' && (
            <>
              <button
                type="button"
                className="eb-btn eb-btn-primary"
                onClick={handleAccept}
                disabled={actionLoading}
              >
                ✓ Accept & Hold Date
              </button>
              <button
                type="button"
                className="eb-btn eb-btn-danger"
                onClick={() => setIsRejectOpen(true)}
                disabled={actionLoading}
              >
                ✕ Reject Request
              </button>
            </>
          )}

          {status === 'CONFIRMED' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="eb-btn eb-btn-primary"
                onClick={handleComplete}
                disabled={!canComplete || actionLoading}
                title={!canComplete ? `Available on or after event date (${formatDate(booking.booking_date)})` : 'Mark complete'}
              >
                Mark as Completed
              </button>
              {!canComplete && (
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  ℹ️ Completion is enabled on/after event date ({formatDate(booking.booking_date)})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="eb-grid eb-grid-2">
        {/* Left Column: Client & Request Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="eb-card">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
              Client & Event Specifications
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Client ID:</span>
                <code>{booking.customer_id}</code>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Contact Phone:</span>
                {isConfirmedOrCompleted ? (
                  <strong style={{ color: '#15803d' }}>{booking.customer_phone || '+91 98765 43210'}</strong>
                ) : (
                  <span style={{ color: '#9ca3af' }}>🔒 Hidden until Confirmed</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Service Package:</span>
                <strong>{booking.package_name || booking.package_name_snapshot || 'Custom Package'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Target Date:</span>
                <span>{formatDate(booking.booking_date)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Audit Timeline */}
        <div className="eb-card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
            Request Lifecycle Audit
          </h3>
          <BookingTimeline history={booking.history || []} />
        </div>
      </div>

      {/* Rejection Prompt Dialog */}
      <ConfirmDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleReject}
        title="Reject Booking Request"
        message="Please provide a reason to decline this request. The client will be updated with this note."
        confirmText="Confirm Rejection"
        confirmVariant="eb-btn-danger"
        requireReason={true}
        reasonPlaceholder="e.g. Schedule fully booked, staff unavailable..."
        loading={actionLoading}
      />
    </div>
  );
}
