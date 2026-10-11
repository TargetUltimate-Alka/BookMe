import React, { useState } from 'react';
import { paymentsApi } from '../api/paymentsApi.js';
import '../payments.css';

export function ReviewModal({ isOpen, onClose, booking, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !booking) return null;

  const vendorName = booking.vendor_name || booking.vendor_name_snapshot || 'Vendor';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await paymentsApi.createReview({
        bookingId: booking.id,
        vendorId: booking.vendor_id,
        rating: Number(rating),
        comment,
      });

      if (onSuccess) onSuccess(res);
      alert('Thank you! Your review has been submitted.');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pay-modal-overlay">
      <div className="pay-modal-card" style={{ maxWidth: '480px' }}>
        <div className="pay-modal-header">
          <h2 className="pay-modal-title">⭐ Review Vendor</h2>
          <button type="button" className="pay-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pay-modal-body">
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
            Share your feedback for <strong>{vendorName}</strong>.
          </p>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              ⚠️ {error}
            </div>
          )}

          <div className="pay-form-group">
            <label className="pay-label">Rating</label>
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '1.75rem', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  style={{ color: star <= rating ? '#eab308' : '#cbd5e1' }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div className="pay-form-group">
            <label className="pay-label">Your Experience</label>
            <textarea
              className="pay-input"
              rows="4"
              placeholder="What did you like about the service? How was their communication and quality?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="pay-btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="pay-btn-submit" style={{ flex: 2 }} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
