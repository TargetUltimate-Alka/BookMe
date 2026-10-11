import React, { useState, useEffect } from 'react';
import { useBookings } from '../../hooks/useBookings.js';
import { bookingsApi } from '../../api/bookingsApi.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { BookingStatusBadge } from '../../components/BookingStatusBadge.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';

export function AdminBookingsPage({ onSelectBooking }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [stats, setStats] = useState(null);

  const { bookings, loading, error, refetch } = useBookings({
    type: 'admin',
    status: statusFilter || undefined,
    vendorId: vendorFilter || undefined,
    customerId: customerFilter || undefined,
  });

  useEffect(() => {
    bookingsApi
      .getAdminStats()
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

  return (
    <div className="eb-container">
      <div className="eb-header">
        <div>
          <h1 className="eb-title">Platform Bookings Administration</h1>
          <p className="eb-subtitle">
            Global oversight, lifecycle auditing, and manual intervention controls for BookMe.
          </p>
        </div>
      </div>

      {/* Platform Stats Grid */}
      {stats && (
        <div className="eb-grid eb-grid-4" style={{ marginBottom: '1.5rem' }}>
          <div className="eb-card">
            <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Contracts
            </span>
            <h2 style={{ margin: '0.35rem 0 0 0', fontSize: '1.6rem', color: '#111827' }}>
              {stats.total_bookings}
            </h2>
          </div>

          <div className="eb-card">
            <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Gross Volume
            </span>
            <h2 style={{ margin: '0.35rem 0 0 0', fontSize: '1.6rem', color: '#4f46e5' }}>
              {formatCurrency(stats.total_gross_volume)}
            </h2>
          </div>

          <div className="eb-card">
            <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Active (Confirmed)
            </span>
            <h2 style={{ margin: '0.35rem 0 0 0', fontSize: '1.6rem', color: '#16a34a' }}>
              {stats.by_status?.CONFIRMED || 0}
            </h2>
          </div>

          <div className="eb-card">
            <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Pending / In Progress
            </span>
            <h2 style={{ margin: '0.35rem 0 0 0', fontSize: '1.6rem', color: '#d97706' }}>
              {(stats.by_status?.PENDING || 0) + (stats.by_status?.ACCEPTED || 0)}
            </h2>
          </div>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div
        className="eb-card"
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: '1 1 180px' }}>
          <label className="eb-label" style={{ fontSize: '0.8rem' }}>Filter by Status</label>
          <select
            className="eb-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div style={{ flex: '1 1 180px' }}>
          <label className="eb-label" style={{ fontSize: '0.8rem' }}>Vendor ID</label>
          <input
            type="text"
            className="eb-input"
            placeholder="e.g. vnd_123"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
          />
        </div>

        <div style={{ flex: '1 1 180px' }}>
          <label className="eb-label" style={{ fontSize: '0.8rem' }}>Customer ID</label>
          <input
            type="text"
            className="eb-input"
            placeholder="e.g. usr_123"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          />
        </div>

        <div>
          <button
            type="button"
            className="eb-btn eb-btn-secondary"
            onClick={() => {
              setStatusFilter('');
              setVendorFilter('');
              setCustomerFilter('');
            }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      {loading ? (
        <Spinner message="Loading platform bookings..." />
      ) : error ? (
        <div className="eb-alert-banner eb-alert-danger">
          <span>Failed to load bookings: {error.message}</span>
          <button type="button" className="eb-btn eb-btn-secondary eb-btn-sm" onClick={refetch} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No bookings match criteria"
          description="Adjust your search filters or status parameters to view platform contracts."
        />
      ) : (
        <div className="eb-table-wrap">
          <table className="eb-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Category & Service</th>
                <th>Customer ID</th>
                <th>Vendor ID</th>
                <th>Event Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const amount = b.amount !== undefined ? b.amount : b.price_snapshot;
                return (
                  <tr key={b.id}>
                    <td>
                      <code>#{b.id.slice(0, 8)}</code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.category || 'Service'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {b.package_name_snapshot || b.package_name || 'Package'}
                      </div>
                    </td>
                    <td>
                      <code>{b.customer_id}</code>
                    </td>
                    <td>
                      <code>{b.vendor_id}</code>
                    </td>
                    <td>{formatDate(b.booking_date)}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(amount)}</td>
                    <td>
                      <BookingStatusBadge status={b.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="eb-btn eb-btn-secondary eb-btn-sm"
                        onClick={() => onSelectBooking && onSelectBooking(b.id)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
