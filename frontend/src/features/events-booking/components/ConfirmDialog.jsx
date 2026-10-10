import React, { useState } from 'react';
import { Modal } from './Modal.jsx';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  confirmVariant = 'eb-btn-danger',
  requireReason = false,
  reasonPlaceholder = 'Please enter reason...',
  loading = false,
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is required to proceed.');
      return;
    }
    setError('');
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            className="eb-btn eb-btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`eb-btn ${confirmVariant}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <div style={{ color: '#374151', fontSize: '0.95rem', lineHeight: 1.5 }}>
        {message && <p style={{ margin: '0 0 1rem 0' }}>{message}</p>}

        {requireReason && (
          <div className="eb-form-group" style={{ marginBottom: 0 }}>
            <label className="eb-label">Reason *</label>
            <textarea
              className="eb-textarea"
              rows={3}
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
            />
            {error && <div className="eb-error-text">{error}</div>}
          </div>
        )}
      </div>
    </Modal>
  );
}
