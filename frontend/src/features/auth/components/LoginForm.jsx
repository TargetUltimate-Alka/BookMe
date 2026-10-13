import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginForm({
  onSwitchToRegister,
  initialEmail = '',
  registrationSuccessMessage = null,
  bookingIntent = null,
  onLoginSuccess = null,
}) {
  const { login } = useAuth();

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const loggedInUser = await login({
        email: email.trim(),
        password,
      });
      if (onLoginSuccess) {
        onLoginSuccess(loggedInUser);
      }
    } catch (err) {
      setApiError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {/* Registration Success Banner */}
      {registrationSuccessMessage && (
        <div
          className="auth-alert-banner"
          style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}
          role="status"
        >
          <span>✅ {registrationSuccessMessage}</span>
        </div>
      )}

      {/* Booking Continuity Alert Banner */}
      {bookingIntent && (
        <div
          className="auth-alert-banner"
          style={{ background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe' }}
          role="status"
        >
          <span>
            ⚡ Sign in to finalize your booking with <strong>{bookingIntent.vendorName}</strong> ({bookingIntent.packageName || 'Selected Package'}).
          </span>
        </div>
      )}

      {apiError && (
        <div className="auth-alert-banner auth-alert-danger" role="alert">
          <span>⚠️ {apiError}</span>
        </div>
      )}

      {/* Email Field */}
      <div className="auth-field-group">
        <label className="auth-label" htmlFor="login-email">
          Email address
        </label>
        <div className="auth-input-wrap">
          <input
            id="login-email"
            type="email"
            className={`auth-input ${fieldErrors.email ? 'has-error' : ''}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: null }));
            }}
            disabled={isSubmitting}
            autoComplete="email"
          />
        </div>
        {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
      </div>

      {/* Password Field */}
      <div className="auth-field-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="auth-label" htmlFor="login-password" style={{ margin: 0 }}>
            Password
          </label>
          <button
            type="button"
            className="auth-link"
            style={{ fontSize: '0.75rem' }}
            onClick={() => setShowForgotPassword(true)}
          >
            Forgot password?
          </button>
        </div>
        <div className="auth-input-wrap">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            className={`auth-input ${fieldErrors.password ? 'has-error' : ''}`}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: null }));
            }}
            disabled={isSubmitting}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="auth-toggle-pwd"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password}</span>}
      </div>

      {/* Password Recovery Info Note */}
      {showForgotPassword && (
        <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#475569' }}>
          ℹ️ For demonstration accounts, you can use password <strong>password123</strong> or click one of the instant demo buttons below.
        </div>
      )}

      {/* Submit Button */}
      <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="auth-spinner" />
            <span>Signing in...</span>
          </>
        ) : (
          <span>{bookingIntent ? 'Sign In & Continue Booking ⚡' : 'Sign In to BookMe'}</span>
        )}
      </button>

      {/* Switch to Register */}
      {onSwitchToRegister && (
        <p className="auth-switch-text">
          Don't have an account yet?{' '}
          <button type="button" className="auth-link" onClick={onSwitchToRegister}>
            Create an account
          </button>
        </p>
      )}

      {/* Quick Demo Access Bar */}
      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
          ⚡ 1-Click Demo Login:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            type="button"
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
            onClick={() => {
              setEmail('customer@bookme.com');
              setPassword('password123');
              setFieldErrors({});
            }}
          >
            👤 Customer Demo
          </button>
          <button
            type="button"
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
            onClick={() => {
              setEmail('vendor@bookme.com');
              setPassword('password123');
              setFieldErrors({});
            }}
          >
            🏢 Vendor Demo
          </button>
        </div>
      </div>
    </form>
  );
}
