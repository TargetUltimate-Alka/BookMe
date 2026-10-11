import React, { useEffect } from 'react';

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = '560px' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="eb-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="eb-modal-content"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="eb-modal-header">
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>
            {title}
          </h3>
          <button
            type="button"
            className="eb-btn eb-btn-ghost eb-btn-sm"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ padding: '0.25rem 0.5rem', fontSize: '1.25rem', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        <div className="eb-modal-body">{children}</div>

        {footer && <div className="eb-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
