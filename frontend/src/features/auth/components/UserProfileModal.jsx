import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function UserProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !user) return null;

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg('Name must be at least 2 characters long');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      await updateProfile(name.trim());
      setIsEditing(false);
      setStatusMsg('Profile name updated successfully!');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  const initials = (user.name || 'User')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recent Member';

  return (
    <div className="auth-profile-overlay" onClick={onClose}>
      <div className="auth-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-profile-header">
          <h2 className="auth-profile-title">Account Profile</h2>
          <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {statusMsg && (
          <div className="auth-alert-banner auth-alert-success" style={{ marginBottom: '1rem' }}>
            <span>✓ {statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="auth-alert-banner auth-alert-danger" style={{ marginBottom: '1rem' }}>
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        <div className="auth-profile-avatar-row">
          <div className="auth-profile-avatar">{initials}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{user.name}</span>
              <span className={`auth-role-badge ${user.role}`}>{user.role}</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{user.email}</span>
          </div>
        </div>

        <div className="auth-profile-fields">
          <div className="auth-profile-field-row">
            <span className="auth-profile-field-label">User Identifier</span>
            <span className="auth-profile-field-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
              {user.id}
            </span>
          </div>

          <div className="auth-profile-field-row">
            <span className="auth-profile-field-label">Account Role</span>
            <span className="auth-profile-field-value" style={{ textTransform: 'capitalize' }}>
              {user.role === 'vendor' ? '🏢 Verified Vendor Partner' : '👤 Event Organizer / Customer'}
            </span>
          </div>

          <div className="auth-profile-field-row">
            <span className="auth-profile-field-label">Member Since</span>
            <span className="auth-profile-field-value">{formattedDate}</span>
          </div>

          {/* Edit Name Section */}
          {isEditing ? (
            <form onSubmit={handleSaveName} style={{ marginTop: '0.5rem' }}>
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="edit-profile-name">
                  Edit Display Name
                </label>
                <input
                  id="edit-profile-name"
                  type="text"
                  className="auth-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  type="submit"
                  className="auth-submit-btn"
                  style={{ marginTop: 0, padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Name'}
                </button>
                <button
                  type="button"
                  className="auth-btn-secondary"
                  onClick={() => {
                    setName(user.name);
                    setIsEditing(false);
                    setErrorMsg(null);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div style={{ marginTop: '0.25rem' }}>
              <button
                type="button"
                className="auth-link"
                onClick={() => setIsEditing(true)}
                style={{ fontSize: '0.8125rem' }}
              >
                ✏️ Edit Display Name
              </button>
            </div>
          )}
        </div>

        <div className="auth-profile-actions">
          <button type="button" className="auth-btn-secondary" onClick={onClose}>
            Done
          </button>
          <button type="button" className="auth-btn-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
