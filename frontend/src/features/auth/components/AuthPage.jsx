import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthPage({
  defaultTab = 'login',
  defaultRole = 'customer',
  bookingIntent = null,
  onCancel = null,
  onLoginSuccess = null,
}) {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'login' | 'register'
  const [selectedRole] = useState(defaultRole);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState(null);

  const handleSwitchToLogin = (data) => {
    setActiveTab('login');
    if (data?.registeredEmail) {
      setRegisteredEmail(data.registeredEmail);
    }
    if (data?.message) {
      setRegistrationSuccessMessage(data.message);
    }
  };

  const handleSwitchToRegister = () => {
    setActiveTab('register');
    setRegistrationSuccessMessage(null);
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Optional Back to Marketplace button */}
        {onCancel && (
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                color: '#6366f1',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
              }}
            >
              ← Back to Marketplace
            </button>
          </div>
        )}

        {/* Brand Header */}
        <div className="auth-card-header">
          <div className="auth-logo-badge">B</div>
          <h1 className="auth-title">
            {activeTab === 'login'
              ? bookingIntent
                ? 'Sign in to Finalize Booking'
                : 'Welcome back to BookMe'
              : 'Join BookMe Platform'}
          </h1>
          <p className="auth-subtitle">
            {activeTab === 'login'
              ? bookingIntent
                ? `Continue with your reservation for ${bookingIntent.vendorName}`
                : 'Sign in to manage your events, budgets, and bookings'
              : 'Create an account to start organizing or offering services'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'login'}
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'register'}
            className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={handleSwitchToRegister}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        {activeTab === 'login' ? (
          <LoginForm
            onSwitchToRegister={handleSwitchToRegister}
            initialEmail={registeredEmail}
            registrationSuccessMessage={registrationSuccessMessage}
            bookingIntent={bookingIntent}
            onLoginSuccess={onLoginSuccess}
          />
        ) : (
          <RegisterForm
            onSwitchToLogin={handleSwitchToLogin}
            initialRole={selectedRole}
          />
        )}
      </div>
    </div>
  );
}
