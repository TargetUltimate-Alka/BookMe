import React from 'react';

export function EmptyState({ icon = '📅', title, description, actionText, onAction }) {
  return (
    <div className="eb-empty-state">
      <div className="eb-empty-icon">{icon}</div>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
        {title}
      </h3>
      {description && (
        <p style={{ margin: '0 auto 1.5rem auto', maxWidth: '440px', color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button type="button" className="eb-btn eb-btn-primary" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}
