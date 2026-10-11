import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function RegisterForm({ onSwitchToLogin, initialRole = 'customer' }) {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(initialRole); // 'customer' | 'vendor'
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

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

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!['customer', 'vendor'].includes(role)) {
      errors.role = 'Please select a valid account role';
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
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      // Successful registration & auto-login updates AuthContext
    } catch (err) {
      setApiError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {apiError && (
        <div className="auth-alert-banner auth-alert-danger" role="alert">
          <span>⚠️ {apiError}</span>
        </div>
      )}

      {/* Role Selector Cards */}
      <div className="auth-field-group">
        <label className="auth-label">Select Account Type</label>
        <div className="auth-role-selector">
          <div
            className={`auth-role-card ${role === 'customer' ? 'selected' : ''}`}
            onClick={() => setRole('customer')}
            role="button"
            tabIndex={0}
          >
            <div className="auth-role-header">
              <span className="auth-role-title">👤 Customer</span>
              {role === 'customer' && <span style={{ color: '#4f46e5', fontWeight: 700 }}>✓</span>}
            </div>
            <span className="auth-role-desc">Plan weddings & events, track budgets and book vendors.</span>
          </div>

          <div
            className={`auth-role-card ${role === 'vendor' ? 'selected' : ''}`}
            onClick={() => setRole('vendor')}
            role="button"
            tabIndex={0}
          >
            <div className="auth-role-header">
              <span className="auth-role-title">🏢 Vendor</span>
              {role === 'vendor' && <span style={{ color: '#4f46e5', fontWeight: 700 }}>✓</span>}
            </div>
            <span className="auth-role-desc">Showcase packages, manage availability and accept bookings.</span>
          </div>
        </div>
        {fieldErrors.role && <span className="auth-field-error">{fieldErrors.role}</span>}
      </div>

      {/* Full Name Field */}
      <div className="auth-field-group">
        <label className="auth-label" htmlFor="register-name">
          {role === 'vendor' ? 'Business or Contact Name' : 'Full Name'}
        </label>
        <div className="auth-input-wrap">
          <input
            id="register-name"
            type="text"
            className={`auth-input ${fieldErrors.name ? 'has-error' : ''}`}
            placeholder={role === 'vendor' ? 'e.g. Royal Caterers or Rahul Shah' : 'e.g. Jane Doe'}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: null }));
            }}
            disabled={isSubmitting}
            autoComplete="name"
          />
        </div>
        {fieldErrors.name && <span className="auth-field-error">{fieldErrors.name}</span>}
      </div>

      {/* Email Field */}
      <div className="auth-field-group">
        <label className="auth-label" htmlFor="register-email">
          Email address
        </label>
        <div className="auth-input-wrap">
          <input
            id="register-email"
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
        <label className="auth-label" htmlFor="register-password">
          Password
        </label>
        <div className="auth-input-wrap">
          <input
            id="register-password"
            type={showPassword ? 'text' : 'password'}
            className={`auth-input ${fieldErrors.password ? 'has-error' : ''}`}
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: null }));
            }}
            disabled={isSubmitting}
            autoComplete="new-password"
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

      {/* Confirm Password Field */}
      <div className="auth-field-group">
        <label className="auth-label" htmlFor="register-confirm-password">
          Confirm Password
        </label>
        <div className="auth-input-wrap">
          <input
            id="register-confirm-password"
            type={showPassword ? 'text' : 'password'}
            className={`auth-input ${fieldErrors.confirmPassword ? 'has-error' : ''}`}
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: null }));
            }}
            disabled={isSubmitting}
            autoComplete="new-password"
          />
        </div>
        {fieldErrors.confirmPassword && (
          <span className="auth-field-error">{fieldErrors.confirmPassword}</span>
        )}
      </div>

      {/* Submit Button */}
      <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="auth-spinner" />
            <span>Creating account...</span>
          </>
        ) : (
          <span>Create {role === 'vendor' ? 'Vendor' : 'Customer'} Account</span>
        )}
      </button>

      {/* Switch to Login */}
      {onSwitchToLogin && (
        <p className="auth-switch-text">
          Already have an account?{' '}
          <button type="button" className="auth-link" onClick={onSwitchToLogin}>
            Sign in
          </button>
        </p>
      )}
    </form>
  );
}
