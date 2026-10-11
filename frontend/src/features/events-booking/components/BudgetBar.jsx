import React from 'react';
import { formatCurrency } from '../utils/formatters.js';

export function BudgetBar({ totalBudget, plannedTotal, actualTotal, overBudget }) {
  const total = Number(totalBudget) || 0;
  const actual = Number(actualTotal) || 0;
  const planned = Number(plannedTotal) || 0;

  const percentageSpent = total > 0 ? Math.min(Math.round((actual / total) * 100), 100) : 0;
  const rawPercentage = total > 0 ? ((actual / total) * 100).toFixed(1) : 0;
  const isOver = overBudget || actual > total;

  const getBarClass = () => {
    if (isOver) return 'eb-progress-bar eb-progress-bar-danger';
    if (percentageSpent >= 80) return 'eb-progress-bar eb-progress-bar-warning';
    return 'eb-progress-bar';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.875rem' }}>
        <div>
          <span style={{ color: '#6b7280' }}>Actual Spend: </span>
          <strong style={{ color: isOver ? '#dc2626' : '#111827', fontSize: '1rem' }}>
            {formatCurrency(actual)}
          </strong>
          <span style={{ color: '#9ca3af', marginLeft: '0.25rem' }}>
            of {formatCurrency(total)}
          </span>
        </div>
        <div>
          <span
            style={{
              fontWeight: 700,
              color: isOver ? '#dc2626' : percentageSpent >= 80 ? '#d97706' : '#4f46e5',
            }}
          >
            {rawPercentage}% Spent
          </span>
        </div>
      </div>

      <div className="eb-progress-wrap" style={{ height: '12px' }}>
        <div className={getBarClass()} style={{ width: `${percentageSpent}%` }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
        <span>Planned Allocation: {formatCurrency(planned)}</span>
        <span>
          Remaining: {formatCurrency(Math.max(0, total - actual))}
        </span>
      </div>

      {isOver && (
        <div className="eb-alert-banner eb-alert-danger" style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem' }}>
          <span>⚠️ <strong>Over-budget alert:</strong> Confirmed spends have exceeded your total event budget!</span>
        </div>
      )}
    </div>
  );
}
