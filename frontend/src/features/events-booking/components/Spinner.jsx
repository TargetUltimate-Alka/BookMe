import React from 'react';

export function Spinner({ message = 'Loading...' }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div className="eb-spinner" />
      {message && (
        <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
          {message}
        </p>
      )}
    </div>
  );
}
