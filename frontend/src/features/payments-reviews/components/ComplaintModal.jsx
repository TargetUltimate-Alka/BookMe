import React, { useState } from 'react';
import { paymentsApi } from '../api/paymentsApi.js';
import '../payments.css';

export function ComplaintModal({ isOpen, onClose, booking, onSuccess }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !booking) return null;

  const vendorName = booking.vendor_name || booking.vendor_name_snapshot || 'Vendor';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await paymentsApi.createComplaint({
        bookingId: booking.id,
        subject,
        description,
      });

      if (onSuccess) onSuccess(res);
      alert('Your dispute has been registered. Support team will investigate.');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to file complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pay-modal-overlay">
      <div className="pay-modal-card" style={{ maxWidth: '480px' }}>
        <div className="pay-modal-header">
          <h2 className="pay-modal-title" style={{ color: '#dc2626' }}>
            ⚠️ Dispute / Raise Complaint
          </h2>
          <button type="button" className="pay-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pay-modal-body">
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
            Filing a dispute for booking <code>{booking.id}</code> ({vendorName}).
          </p>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              ⚠️ {error}
            </div>
          )}

          <div className="pay-form-group">
            <label className="pay-label">Issue Subject</label>
            <input
              type="text"
              className="pay-input"
              placeholder="e.g. Unfulfilled service deliverables, Late arrival"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="pay-form-group">
            <label className="pay-label">Detailed Description</label>
            <textarea
              className="pay-input"
              rows="4"
              placeholder="Describe what occurred, any damages or missed deadlines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="pay-btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="pay-btn-submit"
              style={{ flex: 2, background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
