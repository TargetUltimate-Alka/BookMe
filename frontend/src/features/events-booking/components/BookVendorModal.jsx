import React, { useState, useEffect } from 'react';
import { Modal } from './Modal.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { useEvents } from '../hooks/useEvents.js';
import { bookingsApi } from '../api/bookingsApi.js';

export function BookVendorModal({
  isOpen,
  onClose,
  vendorInfo = {},
  initialEventId,
  onSuccess,
  onCreateNewEvent,
}) {
  const { events, loading: eventsLoading } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialEventId) {
      setSelectedEventId(initialEventId);
    } else if (events && events.length > 0 && !selectedEventId) {
      // Default to first active upcoming event
      const active = events.find((e) => e.status !== 'CANCELLED');
      if (active) setSelectedEventId(active.id);
    }
  }, [initialEventId, events, selectedEventId]);

  if (!isOpen) return null;

  const activeEvents = (events || []).filter((e) => e.status !== 'CANCELLED');
  const selectedEvent = activeEvents.find((e) => e.id === selectedEventId);

  const handleConfirm = async () => {
    if (!selectedEventId) {
      setErrorMsg('Please select an event for this booking.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        event_id: selectedEventId,
        vendor_id: vendorInfo.vendorId || 'vnd_123',
        service_id: vendorInfo.serviceId || 'svc_123',
        package_id: vendorInfo.packageId || 'pkg_123',
        category: vendorInfo.category || selectedEvent?.event_type || 'General Service',
      };

      const result = await bookingsApi.createBooking(payload);
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request booking with vendor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Vendor Booking"
      footer={
        <>
          <button
            type="button"
            className="eb-btn eb-btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="eb-btn eb-btn-primary"
            onClick={handleConfirm}
            disabled={submitting || !selectedEventId}
          >
            {submitting ? 'Sending Request...' : 'Send Booking Request'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Vendor & Package Summary */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="eb-badge" style={{ background: '#e0e7ff', color: '#3730a3', marginBottom: '0.25rem' }}>
                {vendorInfo.category || 'Vendor'}
              </span>
              <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                {vendorInfo.vendorName || 'Selected Vendor'}
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                Package: <strong>{vendorInfo.packageName || 'Standard Service'}</strong>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Package Price</span>
              <strong style={{ fontSize: '1.2rem', color: '#4f46e5' }}>
                {formatCurrency(vendorInfo.price || 50000)}
              </strong>
            </div>
          </div>
        </div>

        {/* Event Selection */}
        <div className="eb-form-group" style={{ marginBottom: 0 }}>
          <label className="eb-label">Choose Target Event *</label>
          {eventsLoading ? (
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading your events...</p>
          ) : activeEvents.length === 0 ? (
            <div style={{ padding: '0.75rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#92400e' }}>
                You don't have any active events planned yet.
              </p>
              {onCreateNewEvent && (
                <button
                  type="button"
                  className="eb-btn eb-btn-primary eb-btn-sm"
                  onClick={() => {
                    onClose();
                    onCreateNewEvent();
                  }}
                >
                  + Create New Event
                </button>
              )}
            </div>
          ) : (
            <select
              className="eb-select"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">Select an event...</option>
              {activeEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({formatDate(ev.event_date)} - {ev.city || 'No city'})
                </option>
              ))}
            </select>
          )}

          {selectedEvent && (
            <p style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '0.35rem' }}>
              Booking will be requested for <strong>{formatDate(selectedEvent.event_date)}</strong> in {selectedEvent.city || 'designated location'}.
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="eb-alert-banner eb-alert-danger" style={{ margin: 0 }}>
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
