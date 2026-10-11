import React from 'react';
import { formatCurrency } from '../utils/formatters.js';

export function SuggestionList({ suggestions }) {
  if (!suggestions) return null;

  const { suggested_categories = [], vendor_tips = [], event_type } = suggestions;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="eb-card">
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 600, color: '#111827' }}>
          💡 Recommended Budget Allocation for {event_type || 'Event'}
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {suggested_categories.map((cat, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: '#f9fafb',
                border: '1px solid #f3f4f6',
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937' }}>
                  {cat.category}
                </span>
                <span
                  style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    background: '#e5e7eb',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                  }}
                >
                  {cat.percentage}%
                </span>
              </div>
              <strong style={{ fontSize: '0.95rem', color: '#4f46e5' }}>
                {formatCurrency(cat.suggested_amount)}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {vendor_tips && vendor_tips.length > 0 && (
        <div className="eb-card" style={{ background: '#f5f3ff', borderColor: '#ddd6fe' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600, color: '#5b21b6' }}>
            ✨ Planner Tips & Best Practices
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#4c1d95', fontSize: '0.875rem', lineHeight: 1.6 }}>
            {vendor_tips.map((tip, idx) => (
              <li key={idx} style={{ marginBottom: '0.35rem' }}>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
