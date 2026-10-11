import React, { useState, useEffect } from 'react';
import { useBooking } from '../../hooks/useBooking.js';
import { useBookingActions } from '../../hooks/useBookingActions.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { BookingStatusBadge } from '../../components/BookingStatusBadge.jsx';
import { BookingTimeline } from '../../components/BookingTimeline.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { PaymentCheckoutModal, ReviewModal, ComplaintModal } from '../../../payments-reviews/index.js';

export function BookingDetailsPage({
  bookingId,
  onNavigateBack,
  onPaymentSuccess,
}) {
  const { booking, loading, error, refetch } = useBooking(bookingId);
  const { cancelBooking, actionLoading } = useBookingActions();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Payment Countdown timer for ACCEPTED status
  useEffect(() => {
    if (!booking || booking.status !== 'ACCEPTED' || !booking.payment_due_at) {
      setTimeRemaining('');
      return;
    }

    const updateCountdown = () => {
      const due = new Date(booking.payment_due_at).getTime();
      const now = new Date().getTime();
      const diff = due - now;

      if (diff <= 0) {
        setTimeRemaining('Payment window expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s remaining`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [booking]);

  if (loading) {
    return (
      <div className="eb-container">
        <Spinner message="Loading booking details..." />
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
            ⬅ Back to Bookings
          </button>
        )}
      </div>
    );
  }

  const status = booking.status ? booking.status.toUpperCase() : 'PENDING';
  const vendorName = booking.vendor_name || booking.vendor_name_snapshot || 'Vendor';
  const packageName = booking.package_name || booking.package_name_snapshot || 'Custom Package';
  const price = booking.amount !== undefined ? booking.amount : booking.price_snapshot;

  const displayItems =
    booking.items && booking.items.length > 0
      ? booking.items
      : [
          {
            name: `${packageName} Base Services`,
            quantity: 1,
            unitPrice: Math.round(Number(price) * 0.75),
            unit: 'package',
            subtotal: Math.round(Number(price) * 0.75),
          },
          {
            name: 'Service Equipment, Staffing & Logistical Setup',
            quantity: 1,
            unitPrice: Math.round(Number(price) * 0.25),
            unit: 'service',
            subtotal: Math.round(Number(price) * 0.25),
          },
        ];

  const handleConfirmCancel = async (reason) => {
    try {
      await cancelBooking(booking.id, reason);
      setIsCancelOpen(false);
      refetch();
    } catch (err) {
      alert(`Error cancelling booking: ${err.message}`);
    }
  };

  const handleSimulatePayment = () => {
    setIsPaymentModalOpen(true);
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
          ⬅ Back to Bookings
        </button>
      )}

      {/* Header Banner */}
      <div className="eb-card" style={{ marginBottom: '1.5rem' }}>
        <div className="eb-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className="eb-badge" style={{ background: '#f3f4f6', color: '#4b5563' }}>
                {booking.category || 'Service'}
              </span>
              <BookingStatusBadge status={status} />
            </div>
            <h1 className="eb-title" style={{ fontSize: '1.75rem' }}>
              {vendorName}
            </h1>
            <p className="eb-subtitle">
              Booking Ref: <code>{booking.id}</code> &bull; Event Date: {formatDate(booking.booking_date)}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
              Contract Total
            </span>
            <strong style={{ fontSize: '1.6rem', color: '#4f46e5' }}>
              {formatCurrency(price)}
            </strong>
          </div>
        </div>

        {/* Status Callout Banner */}
        {status === 'ACCEPTED' && (
          <div className="eb-alert-banner eb-alert-warning" style={{ margin: '1rem 0 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Vendor Accepted Your Request!</strong>
              <div style={{ fontSize: '0.85rem' }}>
                Please finalize payment before the lock window expires: <strong>{timeRemaining}</strong>
              </div>
            </div>
            <button
              type="button"
              className="eb-btn eb-btn-primary"
              onClick={handleSimulatePayment}
            >
              💳 Proceed to Checkout ({formatCurrency(price)})
            </button>
          </div>
        )}

        {status === 'CONFIRMED' && (
          <div className="eb-alert-banner eb-alert-success" style={{ margin: '1rem 0 0 0' }}>
            <span>
              ✅ <strong>Booking Confirmed & Date Locked:</strong> The vendor has confirmed your date. Payment has been processed.
            </span>
          </div>
        )}

        {status === 'COMPLETED' && (
          <div className="eb-alert-banner eb-alert-success" style={{ margin: '1rem 0 0 0' }}>
            <span>
              🎉 <strong>Service Completed:</strong> Thank you for booking with BookMe! How was your experience?
            </span>
          </div>
        )}

        {status === 'REJECTED' && (
          <div className="eb-alert-banner eb-alert-danger" style={{ margin: '1rem 0 0 0' }}>
            <span>
              ❌ <strong>Booking Declined by Vendor:</strong> {booking.rejection_reason || 'Vendor is unavailable for this date.'}
            </span>
          </div>
        )}

        {status === 'CANCELLED' && (
          <div className="eb-alert-banner eb-alert-danger" style={{ margin: '1rem 0 0 0' }}>
            <span>
              ⚠️ <strong>Booking Cancelled:</strong> {booking.cancellation_reason || 'Booking was cancelled.'} (Cancelled by: {booking.cancelled_by || 'Customer'})
            </span>
          </div>
        )}
      </div>

      <div className="eb-grid eb-grid-2">
        {/* Left Column: Details & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="eb-card">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
              Service & Package Specifications
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Selected Package:</span>
                <strong>{packageName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Category:</span>
                <span>{booking.category || 'General'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Reserved Date:</span>
                <span>{formatDate(booking.booking_date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#6b7280' }}>Snapshot Price:</span>
                <strong style={{ color: '#4f46e5' }}>{formatCurrency(price)}</strong>
              </div>
              {booking.vendor_response_due_at && status === 'PENDING' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Vendor Response Due:</span>
                  <span>{new Date(booking.vendor_response_due_at).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
              {['PENDING', 'ACCEPTED', 'CONFIRMED'].includes(status) && (
                <button
                  type="button"
                  className="eb-btn eb-btn-ghost eb-btn-sm"
                  style={{ color: '#ef4444' }}
                  onClick={() => setIsCancelOpen(true)}
                  disabled={actionLoading}
                >
                  Cancel Booking
                </button>
              )}

              {status === 'COMPLETED' && (
                <button
                  type="button"
                  className="eb-btn eb-btn-secondary eb-btn-sm"
                  onClick={() => setIsReviewModalOpen(true)}
                >
                  ⭐ Write Review
                </button>
              )}

              {['CONFIRMED', 'COMPLETED'].includes(status) && (
                <button
                  type="button"
                  className="eb-btn eb-btn-ghost eb-btn-sm"
                  onClick={() => setIsComplaintModalOpen(true)}
                >
                  Raise Complaint
                </button>
              )}
            </div>
          </div>

          {/* Itemized Services & Quantities Breakdown */}
          <div className="eb-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
                Itemized Services & Quantities
              </h3>
              <span className="eb-badge" style={{ background: '#f3f4f6', color: '#4b5563' }}>
                {displayItems.length} items
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Item / Service</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500, color: '#111827' }}>
                        {item.name}
                        {item.unit && item.unit !== 'unit' && (
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>
                            Unit: {item.unit}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#6b7280' }}>
                        {formatCurrency(item.unitPrice || item.unit_price || 0)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                        {formatCurrency(item.subtotal || (item.quantity * (item.unitPrice || item.unit_price || 0)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
                    <td colSpan={3} style={{ padding: '0.75rem', fontWeight: 700, color: '#111827' }}>
                      Total Contract Value
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#4f46e5', fontSize: '1rem' }}>
                      {formatCurrency(price)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Status Transition Audit Timeline */}
        <div className="eb-card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
            Status Lifecycle Audit
          </h3>
          <BookingTimeline history={booking.history || []} />
        </div>
      </div>

      {/* Cancel Dialog with Policy Prompt */}
      <ConfirmDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Booking Request"
        message={
          <>
            Are you sure you want to cancel this booking?
            <br />
            <br />
            <span style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', background: '#f3f4f6', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
              <strong>Cancellation Policy (SRS §9.3):</strong>
              <br />• &gt; 14 days before event: 100% refund
              <br />• 7–14 days before event: 50% refund
              <br />• &lt; 7 days before event: Non-refundable
            </span>
          </>
        }
        confirmText="Confirm Cancellation"
        confirmVariant="eb-btn-danger"
        requireReason={true}
        reasonPlaceholder="State cancellation reason..."
        loading={actionLoading}
      />

      {/* Payment Authentication Checkout Modal */}
      <PaymentCheckoutModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        booking={booking}
        onPaymentSuccess={(confirmedBkg) => {
          setIsPaymentModalOpen(false);
          refetch();
          if (onPaymentSuccess) {
            onPaymentSuccess(confirmedBkg);
          }
        }}
      />

      {/* Write Vendor Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        booking={booking}
        onSuccess={() => refetch()}
      />

      {/* Dispute & Complaint Modal */}
      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        booking={booking}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
