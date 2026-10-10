import React, { useState } from 'react';
import { useBookings } from '../../hooks/useBookings.js';
import { useBookingActions } from '../../hooks/useBookingActions.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { BookingStatusBadge } from '../../components/BookingStatusBadge.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';

export function VendorRequestsPage({ onSelectRequest }) {
  const [activeFilter, setActiveFilter] = useState('PENDING');
  const [rejectingBooking, setRejectingBooking] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  const { bookings, loading, error, refetch } = useBookings({
    type: 'vendor',
    status: activeFilter === 'ALL' ? undefined : activeFilter,
  });

  const { acceptBooking, rejectBooking, actionLoading } = useBookingActions();

  const handleAccept = async (booking) => {
    try {
      await acceptBooking(booking.id);
      setActionSuccess(`Booking #${booking.id.slice(0, 8)} accepted! 24h payment window opened for customer.`);
      refetch();
    } catch (err) {
      alert(`Failed to accept booking: ${err.message}`);
    }
  };

  const handleConfirmReject = async (reason) => {
    if (!rejectingBooking) return;
    try {
      await rejectBooking(rejectingBooking.id, reason);
      setActionSuccess(`Booking #${rejectingBooking.id.slice(0, 8)} rejected.`);
      setRejectingBooking(null);
      refetch();
    } catch (err) {
      alert(`Failed to reject booking: ${err.message}`);
    }
  };

  const tabs = ['PENDING', 'ACCEPTED', 'CONFIRMED', 'COMPLETED', 'ALL'];

  return (
    <div className="eb-container">
      <div className="eb-header">
        <div>
          <h1 className="eb-title">Vendor Booking Requests</h1>
          <p className="eb-subtitle">
            Manage incoming inquiries, review client event dates, and confirm appointments.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="eb-alert-banner eb-alert-success" style={{ marginBottom: '1.25rem' }}>
          <span>{actionSuccess}</span>
          <button
            type="button"
            className="eb-btn eb-btn-ghost eb-btn-sm"
            onClick={() => setActionSuccess('')}
            style={{ marginLeft: 'auto' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="eb-tabs">
        {tabs.map((tab) => (
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

      {loading ? (
        <Spinner message="Loading incoming requests..." />
      ) : error ? (
        <div className="eb-alert-banner eb-alert-danger">
          <span>Failed to load requests: {error.message}</span>
          <button type="button" className="eb-btn eb-btn-secondary eb-btn-sm" onClick={refetch} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="📬"
          title={`No ${activeFilter.toLowerCase()} requests`}
          description={`You do not have any bookings currently in ${activeFilter.toLowerCase()} status.`}
        />
      ) : (
        <div className="eb-table-wrap">
          <table className="eb-table">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Category & Package</th>
                <th>Event Date</th>
                <th>Contract Amount</th>
                <th>Status</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const status = (b.status || 'PENDING').toUpperCase();
                const amount = b.amount !== undefined ? b.amount : b.price_snapshot;

                return (
                  <tr key={b.id}>
                    <td>
                      <code
                        style={{ cursor: 'pointer', color: '#4f46e5', fontWeight: 600 }}
                        onClick={() => onSelectRequest && onSelectRequest(b.id)}
                      >
                        #{b.id.slice(0, 8)}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.category || 'Service'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {b.package_name || b.package_name_snapshot || 'Standard Package'}
                      </div>
                    </td>
                    <td>📅 {formatDate(b.booking_date)}</td>
                    <td style={{ fontWeight: 700, color: '#111827' }}>
                      {formatCurrency(amount)}
                    </td>
                    <td>
                      <BookingStatusBadge status={status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              className="eb-btn eb-btn-primary eb-btn-sm"
                              onClick={() => handleAccept(b)}
                              disabled={actionLoading}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="eb-btn eb-btn-ghost eb-btn-sm"
                              style={{ color: '#ef4444' }}
                              onClick={() => setRejectingBooking(b)}
                              disabled={actionLoading}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          className="eb-btn eb-btn-secondary eb-btn-sm"
                          onClick={() => onSelectRequest && onSelectRequest(b.id)}
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Request Dialog */}
      <ConfirmDialog
        isOpen={Boolean(rejectingBooking)}
        onClose={() => setRejectingBooking(null)}
        onConfirm={handleConfirmReject}
        title="Reject Booking Request"
        message="Please provide a reason why you cannot accommodate this booking request. The client will be notified."
        confirmText="Confirm Rejection"
        confirmVariant="eb-btn-danger"
        requireReason={true}
        reasonPlaceholder="e.g. Fully booked on this date, unavailable equipment..."
        loading={actionLoading}
      />
    </div>
  );
}
