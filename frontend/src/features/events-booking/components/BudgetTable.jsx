import React, { useState } from 'react';
import { formatCurrency } from '../utils/formatters.js';

export function BudgetTable({ budget, onUpdateBudget, updating = false }) {
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

  if (!budget || !budget.categories) {
    return <p style={{ color: '#6b7280', textAlign: 'center' }}>No budget data available.</p>;
  }

  const { categories, totalBudget, plannedTotal, actualTotal, remaining, overBudget, plannedExceedsBudget } = budget;

  const startEditing = () => {
    const initial = {};
    categories.forEach((cat) => {
      initial[cat.category] = cat.planned_amount;
    });
    setEditValues(initial);
    setErrorMsg('');
    setEditing(true);
  };

  const handleValueChange = (category, val) => {
    setEditValues((prev) => ({
      ...prev,
      [category]: val === '' ? 0 : Number(val),
    }));
  };

  const handleSave = async () => {
    const payload = Object.entries(editValues).map(([category, planned_amount]) => ({
      category,
      planned_amount: Number(planned_amount) || 0,
    }));

    try {
      await onUpdateBudget(payload);
      setEditing(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update budget categories');
    }
  };

  const currentPlannedSum = editing
    ? Object.values(editValues).reduce((acc, curr) => acc + (Number(curr) || 0), 0)
    : plannedTotal;

  const plannedOverBudget = currentPlannedSum > totalBudget;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
            Category Budget Breakdown
          </h4>
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            Planned: {formatCurrency(currentPlannedSum)} of {formatCurrency(totalBudget)}
          </span>
        </div>

        <div>
          {editing ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="eb-btn eb-btn-secondary eb-btn-sm"
                onClick={() => setEditing(false)}
                disabled={updating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="eb-btn eb-btn-primary eb-btn-sm"
                onClick={handleSave}
                disabled={updating}
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="eb-btn eb-btn-secondary eb-btn-sm"
              onClick={startEditing}
            >
              ✏️ Edit Planned Allocations
            </button>
          )}
        </div>
      </div>

      {(plannedOverBudget || plannedExceedsBudget) && (
        <div className="eb-alert-banner eb-alert-warning" style={{ margin: 0 }}>
          <span>
            ⚠️ <strong>Warning:</strong> Total planned allocations ({formatCurrency(currentPlannedSum)}) exceed your event budget ({formatCurrency(totalBudget)}).
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="eb-alert-banner eb-alert-danger" style={{ margin: 0 }}>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="eb-table-wrap">
        <table className="eb-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Planned Amount</th>
              <th>Actual Spend</th>
              <th>Remaining</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => {
              const plannedVal = editing ? editValues[cat.category] ?? cat.planned_amount : cat.planned_amount;
              const actualVal = Number(cat.actual_amount) || 0;
              const catRemaining = Math.max(0, plannedVal - actualVal);
              const isCatOver = actualVal > plannedVal && plannedVal > 0;

              return (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{cat.category}</td>
                  <td>
                    {editing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', maxWidth: '140px' }}>
                        <span>₹</span>
                        <input
                          type="number"
                          className="eb-input"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                          value={plannedVal}
                          onChange={(e) => handleValueChange(cat.category, e.target.value)}
                          min="0"
                        />
                      </div>
                    ) : (
                      formatCurrency(cat.planned_amount)
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: actualVal > 0 ? '#111827' : '#9ca3af' }}>
                    {formatCurrency(actualVal)}
                  </td>
                  <td style={{ color: isCatOver ? '#dc2626' : '#166534', fontWeight: 600 }}>
                    {formatCurrency(catRemaining)}
                  </td>
                  <td>
                    {isCatOver ? (
                      <span className="eb-badge eb-badge-rejected">Over budget</span>
                    ) : actualVal > 0 ? (
                      <span className="eb-badge eb-badge-confirmed">Booked</span>
                    ) : (
                      <span className="eb-badge eb-badge-cancelled">Unallocated</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
              <td>TOTAL</td>
              <td>{formatCurrency(currentPlannedSum)}</td>
              <td>{formatCurrency(actualTotal)}</td>
              <td>{formatCurrency(remaining)}</td>
              <td>
                {overBudget ? (
                  <span className="eb-badge eb-badge-rejected">Over Total</span>
                ) : (
                  <span className="eb-badge eb-badge-confirmed">On Track</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
