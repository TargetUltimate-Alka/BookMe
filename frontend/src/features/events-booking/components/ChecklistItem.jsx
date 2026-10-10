import React from 'react';
import { formatDate } from '../utils/formatters.js';

export function ChecklistItem({ item, onToggle, onEdit, onDelete, actionLoading = false }) {
  if (!item) return null;

  const isOverdue = !item.done && Boolean(item.is_overdue);

  return (
    <div
      className={`eb-checklist-item ${item.done ? 'eb-checklist-item-done' : ''} ${
        isOverdue ? 'eb-checklist-item-overdue' : ''
      }`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
        <input
          type="checkbox"
          checked={Boolean(item.done)}
          onChange={() => onToggle && onToggle(item.id)}
          disabled={actionLoading}
          style={{
            width: '18px',
            height: '18px',
            cursor: 'pointer',
            accentColor: '#4f46e5',
            flexShrink: 0,
          }}
          aria-label={`Mark "${item.task}" as ${item.done ? 'incomplete' : 'complete'}`}
        />

        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.95rem',
              fontWeight: 500,
              color: item.done ? '#6b7280' : '#111827',
              wordBreak: 'break-word',
            }}
          >
            {item.task}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
            {item.category && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#4b5563',
                  background: '#f3f4f6',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                }}
              >
                {item.category}
              </span>
            )}

            {item.due_date && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: isOverdue ? '#dc2626' : '#6b7280',
                  fontWeight: isOverdue ? 600 : 400,
                }}
              >
                Due: {formatDate(item.due_date)}
              </span>
            )}

            {isOverdue && (
              <span className="eb-badge eb-badge-overdue" style={{ fontSize: '0.65rem' }}>
                OVERDUE
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
        {onEdit && (
          <button
            type="button"
            className="eb-btn eb-btn-ghost eb-btn-sm"
            onClick={() => onEdit(item)}
            title="Edit task"
            style={{ padding: '0.2rem 0.4rem' }}
          >
            ✏️
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            className="eb-btn eb-btn-ghost eb-btn-sm"
            onClick={() => onDelete(item.id)}
            title="Delete task"
            style={{ padding: '0.2rem 0.4rem', color: '#ef4444' }}
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}
