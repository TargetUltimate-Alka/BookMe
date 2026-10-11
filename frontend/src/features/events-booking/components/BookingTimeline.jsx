import React from 'react';
import { formatDate } from '../utils/formatters.js';

export function BookingTimeline({ history = [] }) {
  if (!history || history.length === 0) {
    return <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No status updates recorded yet.</p>;
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div
        style={{
          position: 'absolute',
          top: '0.5rem',
          bottom: '0.5rem',
          left: '7px',
          width: '2px',
          background: '#e5e7eb',
        }}
      />

      {history.map((step, idx) => {
        const timeStr = step.created_at ? new Date(step.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const dateStr = formatDate(step.created_at);

        return (
          <div key={idx} style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: '-1.5rem',
                top: '4px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: idx === history.length - 1 ? '#4f46e5' : '#9ca3af',
                border: '3px solid #ffffff',
                boxShadow: '0 0 0 1px #e5e7eb',
              }}
            />

            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.95rem', color: '#111827' }}>
                  {step.from_status ? `${step.from_status} ➔ ${step.to_status}` : step.to_status}
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {dateStr} {timeStr}
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '0.2rem' }}>
                Updated by: <code>{step.changed_by || 'system'}</code>
              </div>

              {step.reason && (
                <div
                  style={{
                    marginTop: '0.35rem',
                    padding: '0.35rem 0.6rem',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#374151',
                    borderLeft: '3px solid #ef4444',
                  }}
                >
                  Reason: {step.reason}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
