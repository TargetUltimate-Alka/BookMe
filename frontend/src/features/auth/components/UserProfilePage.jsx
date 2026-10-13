import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../../events-booking/api/eventsApi';
import { bookingsApi } from '../../events-booking/api/bookingsApi';

export function UserProfilePage({
  onNavigateToEvents,
  onNavigateToBookings,
  onNavigateToMarketplace,
  onNavigateToCreateEvent,
  onNavigateToVendorPortal,
  onLogout,
}) {
  const { user, updateProfile, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    eventsCount: 0,
    bookingsCount: 0,
    loading: true,
  });

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        if (!user) return;
        const [eventsRes, bookingsRes] = await Promise.allSettled([
          user.role === 'customer' ? eventsApi.getEvents() : Promise.resolve([]),
          user.role === 'customer'
            ? bookingsApi.getBookings()
            : user.role === 'vendor'
            ? bookingsApi.getVendorBookings()
            : Promise.resolve([]),
        ]);

        if (mounted) {
          const eventsList = eventsRes.status === 'fulfilled' && Array.isArray(eventsRes.value) ? eventsRes.value : [];
          const bookingsList = bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value) ? bookingsRes.value : [];
          setStats({
            eventsCount: eventsList.length,
            bookingsCount: bookingsList.length,
            loading: false,
          });
        }
      } catch {
        if (mounted) {
          setStats((prev) => ({ ...prev, loading: false }));
        }
      }
    }
    loadStats();
    return () => {
      mounted = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="eb-container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontSize: '1rem' }}>No authenticated profile found. Please sign in.</p>
        <button
          type="button"
          className="eb-btn eb-btn-primary"
          onClick={onNavigateToMarketplace}
          style={{ marginTop: '1rem' }}
        >
          Go to Marketplace
        </button>
      </div>
    );
  }

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
      setStatusMsg('Profile display name updated successfully!');
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOutClick = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      await logout();
      if (onNavigateToMarketplace) onNavigateToMarketplace();
    }
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

  const roleLabel =
    user.role === 'vendor'
      ? '🏢 Verified Vendor Partner'
      : user.role === 'admin'
      ? '🛡️ Platform Administrator'
      : '👤 Event Organizer / Customer';

  return (
    <div className="eb-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem 3rem 1rem' }}>
      {/* Breadcrumb / Top Return */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
          <button
            type="button"
            onClick={onNavigateToMarketplace}
            style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
            ← Marketplace
          </button>
          <span>/</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>My Account Profile</span>
        </div>
        <button
          type="button"
          onClick={handleSignOutClick}
          className="auth-btn-logout"
          style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
          title="Sign out of your session"
        >
          Sign Out
        </button>
      </div>

      {statusMsg && (
        <div className="auth-alert-banner auth-alert-success" style={{ marginBottom: '1.25rem' }}>
          <span>✓ {statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="auth-alert-banner auth-alert-danger" style={{ marginBottom: '1.25rem' }}>
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div
        className="eb-card"
        style={{
          background: 'linear-gradient(135deg, #14243b 0%, #1e3a5f 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '1.75rem',
          marginBottom: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(20, 36, 59, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '20px',
              background:
                user.role === 'vendor'
                  ? 'linear-gradient(135deg, #7c3aed, #ec4899)'
                  : 'linear-gradient(135deg, #ff5a36, #f4b740)',
              color: '#ffffff',
              fontSize: '1.75rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                {user.name}
              </h1>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(4px)',
                  color: '#ffffff',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {user.role}
              </span>
              <span
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                ✓ Active
              </span>
            </div>

            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#cbd5e1' }}>
              {user.email} &bull; Member since {formattedDate}
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ✏️ Edit Display Name
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inline Edit Form if triggered */}
        {isEditing && (
          <form
            onSubmit={handleSaveName}
            style={{
              marginTop: '1.25rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              autoFocus
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#0f172a',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            />
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: '#ff5a36',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Name'}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setName(user.name);
                setIsEditing(false);
                setErrorMsg(null);
              }}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                background: 'transparent',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Account Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {user.role === 'customer' && (
          <>
            <div
              className="eb-card"
              style={{
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onClick={onNavigateToEvents}
              title="Click to view My Events"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Planned Events
                </span>
                <span style={{ fontSize: '1.25rem' }}>📅</span>
              </div>
              <h2 style={{ margin: '0.4rem 0 0.15rem 0', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                {stats.loading ? '...' : stats.eventsCount}
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 600 }}>
                View &amp; manage events ➔
              </span>
            </div>

            <div
              className="eb-card"
              style={{
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onClick={onNavigateToBookings}
              title="Click to view My Bookings"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Vendor Bookings
                </span>
                <span style={{ fontSize: '1.25rem' }}>🤝</span>
              </div>
              <h2 style={{ margin: '0.4rem 0 0.15rem 0', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                {stats.loading ? '...' : stats.bookingsCount}
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                Check contracts &amp; quotes ➔
              </span>
            </div>
          </>
        )}

        {user.role === 'vendor' && (
          <div
            className="eb-card"
            style={{
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onClick={onNavigateToVendorPortal}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Vendor Orders &amp; Inquiries
              </span>
              <span style={{ fontSize: '1.25rem' }}>💼</span>
            </div>
            <h2 style={{ margin: '0.4rem 0 0.15rem 0', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              {stats.loading ? '...' : stats.bookingsCount}
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600 }}>
              Open Operating Portal ➔
            </span>
          </div>
        )}

        <div className="eb-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Account Status
            </span>
            <span style={{ fontSize: '1.25rem' }}>🛡️</span>
          </div>
          <h2 style={{ margin: '0.4rem 0 0.15rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>
            Verified
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Full access to platform services
          </span>
        </div>
      </div>

      {/* Quick Navigation Hub */}
      <div className="eb-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
          ⚡ Quick Navigation Hub
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {user.role === 'customer' && (
            <>
              <button
                type="button"
                className="eb-btn eb-btn-primary"
                onClick={onNavigateToCreateEvent}
                style={{ justifyContent: 'center', padding: '0.75rem 1rem' }}
              >
                + Plan a New Event
              </button>

              <button
                type="button"
                className="eb-btn eb-btn-secondary"
                onClick={onNavigateToEvents}
                style={{ justifyContent: 'center', padding: '0.75rem 1rem' }}
              >
                📅 My Events Dashboard
              </button>

              <button
                type="button"
                className="eb-btn eb-btn-secondary"
                onClick={onNavigateToBookings}
                style={{ justifyContent: 'center', padding: '0.75rem 1rem' }}
              >
                🤝 My Vendor Bookings
              </button>
            </>
          )}

          {user.role === 'vendor' && (
            <button
              type="button"
              className="eb-btn eb-btn-primary"
              onClick={onNavigateToVendorPortal}
              style={{ justifyContent: 'center', padding: '0.75rem 1rem' }}
            >
              🏢 Vendor Operating Portal
            </button>
          )}

          <button
            type="button"
            className="eb-btn eb-btn-secondary"
            onClick={onNavigateToMarketplace}
            style={{ justifyContent: 'center', padding: '0.75rem 1rem' }}
          >
            🛍️ Browse Marketplace
          </button>
        </div>
      </div>

      {/* Account Details & Specifications */}
      <div className="eb-card">
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
          🔒 Account Details &amp; Security
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Full Name
            </span>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
              {user.name}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Email Address
            </span>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
              {user.email}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Role Tier
            </span>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
              {roleLabel}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              User Identifier (UUID)
            </span>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', fontFamily: 'monospace', color: '#475569' }}>
              {user.id}
            </p>
          </div>
        </div>

        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>End Active Session</span>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              Sign out safely to invalidate session tokens on this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOutClick}
            className="auth-btn-logout"
            style={{ padding: '0.5rem 1.25rem' }}
          >
            Sign Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
