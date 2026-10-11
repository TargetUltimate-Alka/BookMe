import React, { useState } from 'react';
import { useBookings } from '../../hooks/useBookings.js';
import { useBookingActions } from '../../hooks/useBookingActions.js';
import { BookingCard } from '../../components/BookingCard.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';

export function MyBookingsPage({ onSelectBooking, onNavigateToEvents }) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const { bookings, loading, error, refetch } = useBookings({
    type: 'customer',
    status: activeFilter === 'ALL' ? undefined : activeFilter,
  });

  const { cancelBooking, actionLoading } = useBookingActions();

  const handleCancelConfirm = async (reason) => {
    if (!bookingToCancel) return;
    try {
      await cancelBooking(bookingToCancel.id, reason);
      setToastMsg(`Booking #${bookingToCancel.id.slice(0, 8)} cancelled successfully.`);
      setBookingToCancel(null);
      refetch();
    } catch (err) {
      alert(`Error cancelling booking: ${err.message}`);
    }
  };

  const statusTabs = ['ALL', 'PENDING', 'ACCEPTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

  return (
    <div className="eb-container">
      <div className="eb-header">
        <div>
          <h1 className="eb-title">My Bookings</h1>
          <p className="eb-subtitle">
            Track all requested and confirmed vendor service contracts across your events.
          </p>
        </div>

        {onNavigateToEvents && (
          <button
            type="button"
            className="eb-btn eb-btn-secondary"
            onClick={onNavigateToEvents}
          >
            📅 View My Events
          </button>
        )}
      </div>

      {toastMsg && (
        <div className="eb-alert-banner eb-alert-success" style={{ marginBottom: '1.5rem' }}>
          <span>{toastMsg}</span>
          <button
            type="button"
            className="eb-btn eb-btn-ghost eb-btn-sm"
            onClick={() => setToastMsg('')}
            style={{ marginLeft: 'auto' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="eb-tabs">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`eb-tab ${activeFilter === tab ? 'eb-tab-active' : ''}`}
            onClick={() => setActiveFilter(tab)}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Bookings List Content */}
      {loading ? (
        <Spinner message="Loading your bookings..." />
      ) : error ? (
        <div className="eb-alert-banner eb-alert-danger">
          <span>Failed to load bookings: {error.message}</span>
          <button
            type="button"
            className="eb-btn eb-btn-secondary eb-btn-sm"
            onClick={refetch}
            style={{ marginLeft: 'auto' }}
          >
            Retry
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="🤝"
          title={activeFilter === 'ALL' ? 'No bookings found' : `No ${activeFilter.toLowerCase()} bookings`}
          description={
            activeFilter === 'ALL'
              ? 'You have not sent any vendor booking requests yet. Browse your events to find and request vendors.'
              : `You have no bookings currently in ${activeFilter.toLowerCase()} status.`
          }
          actionText={onNavigateToEvents ? 'Go to Events' : null}
          onAction={onNavigateToEvents}
        />
      ) : (
        <div className="eb-grid eb-grid-3">
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onViewDetails={onSelectBooking}
              onPayNow={(booking) => {
                if (onSelectBooking) onSelectBooking(booking.id);
              }}
              onCancel={(booking) => setBookingToCancel(booking)}
              onReview={(booking) => {
                alert(`Redirecting to review flow for ${booking.vendor_name || 'vendor'} (Booking #${booking.id.slice(0, 8)})`);
              }}
              onComplaint={(booking) => {
                alert(`Redirecting to complaint dispute form for Booking #${booking.id.slice(0, 8)}`);
              }}
            />
          ))}
        </div>
      )}

      {/* Cancellation Confirmation Dialog with SRS §9.3 Refund Policy */}
      <ConfirmDialog
        isOpen={Boolean(bookingToCancel)}
        onClose={() => setBookingToCancel(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Booking Request"
        message={
          <>
            Are you sure you want to cancel this booking with{' '}
            <strong>{bookingToCancel?.vendor_name_snapshot || 'the vendor'}</strong>?
            <br />
            <br />
            <span style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', background: '#f3f4f6', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
              <strong>BookMe Cancellation Policy (SRS §9.3):</strong>
              <br />• &gt; 14 days before event: 100% refund
              <br />• 7–14 days before event: 50% refund
              <br />• &lt; 7 days before event: Non-refundable
            </span>
          </>
        }
        confirmText="Confirm Cancellation"
        confirmVariant="eb-btn-danger"
        requireReason={true}
        reasonPlaceholder="Please state why you are cancelling..."
        loading={actionLoading}
      />
    </div>
  );
}
