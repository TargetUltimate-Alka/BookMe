import React, { useState } from 'react';
import { authApi } from '../api/authApi';

export function RegisterForm({ onSwitchToLogin, initialRole = 'customer' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(initialRole); // 'customer' | 'vendor'
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSendOtp = () => {
    setOtpError(null);
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setOtpError('Please enter a valid 10-digit mobile number');
      return;
    }
    setOtpSent(true);
    setOtpCode('123456'); // Default simulated test OTP
  };

  const handleVerifyOtp = () => {
    setOtpError(null);
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit OTP code');
      return;
    }
    // Demo verification code (accept 123456 or any 6 digits)
    if (otpCode.trim() === '123456' || otpCode.trim().length === 6) {
      setOtpVerified(true);
      setOtpError(null);
    } else {
      setOtpError('Invalid OTP code. Please use 123456.');
    }
  };

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

    const cleanedPhone = phone.replace(/\D/g, '');
    if (!cleanedPhone || cleanedPhone.length < 10) {
      errors.phone = 'Valid 10-digit phone number is required';
    } else if (!otpVerified) {
      errors.otp = 'Please verify your phone number via OTP (FR-ONB-01)';
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
      // 1. Create account using existing registration API (FR-ONB-01 / contracts)
      await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim(),
      });

      // 2. Per Phase Four specifications:
      // Do NOT automatically log the user in after registration.
      // Redirect the user to Sign In and display a message explaining the account was created.
      setSuccessMessage('Account created successfully! Redirecting you to Sign In...');

      setTimeout(() => {
        if (onSwitchToLogin) {
          onSwitchToLogin({
            registeredEmail: email.trim(),
            message: 'Account created successfully! Please sign in with your credentials to continue.',
          });
        }
      }, 900);
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

      {successMessage && (
        <div className="auth-alert-banner" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }} role="status">
          <span>✅ {successMessage}</span>
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
              <span className="auth-role-title">👤 Customer / Event Host</span>
              {role === 'customer' && <span style={{ color: '#4f46e5', fontWeight: 700 }}>✓</span>}
            </div>
            <span className="auth-role-desc">Plan weddings & parties, track budgets, and book verified vendors.</span>
          </div>

          <div
            className={`auth-role-card ${role === 'vendor' ? 'selected' : ''}`}
            onClick={() => setRole('vendor')}
            role="button"
            tabIndex={0}
          >
            <div className="auth-role-header">
              <span className="auth-role-title">🏢 Service Vendor</span>
              {role === 'vendor' && <span style={{ color: '#4f46e5', fontWeight: 700 }}>✓</span>}
            </div>
            <span className="auth-role-desc">List photography, catering or decor packages & receive booking requests.</span>
          </div>
        </div>
        {fieldErrors.role && <span className="auth-field-error">{fieldErrors.role}</span>}
      </div>

      {/* Full Name Field */}
      <div className="auth-field-group">
        <label className="auth-label" htmlFor="register-name">
          {role === 'vendor' ? 'Business or Professional Name *' : 'Full Name *'}
        </label>
        <div className="auth-input-wrap">
          <input
            id="register-name"
            type="text"
            className={`auth-input ${fieldErrors.name ? 'has-error' : ''}`}
            placeholder={role === 'vendor' ? 'e.g. Royal Caterers or Rahul Shah' : 'e.g. Aarav Sharma'}
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
          Email address *
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

      {/* Phone Number & OTP Verification (FR-ONB-01) */}
      <div className="auth-field-group">
        <label className="auth-label" htmlFor="register-phone">
          Mobile Number & OTP Verification * (FR-ONB-01)
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="auth-input-wrap" style={{ flex: 1 }}>
            <input
              id="register-phone"
              type="tel"
              className={`auth-input ${fieldErrors.phone ? 'has-error' : ''}`}
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setOtpVerified(false);
                if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: null }));
              }}
              disabled={isSubmitting || otpVerified}
              autoComplete="tel"
            />
          </div>
          {!otpVerified && (
            <button
              type="button"
              onClick={handleSendOtp}
              style={{
                padding: '0 14px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {otpSent ? 'Resend OTP' : 'Send OTP'}
            </button>
          )}
          {otpVerified && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '0 12px',
                background: '#ecfdf5',
                color: '#065f46',
                borderRadius: '10px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                border: '1px solid #a7f3d0',
              }}
            >
              ✓ Verified
            </div>
          )}
        </div>
        {fieldErrors.phone && <span className="auth-field-error">{fieldErrors.phone}</span>}

        {/* OTP Verification Input Row */}
        {otpSent && !otpVerified && (
          <div style={{ marginTop: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '6px' }}>
              Enter 6-digit verification code sent to your mobile (Test code: <strong>123456</strong>):
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="auth-input"
                style={{ width: '130px', textAlign: 'center', letterSpacing: '4px', fontWeight: 700 }}
              />
              <button
                type="button"
                onClick={handleVerifyOtp}
                style={{
                  padding: '6px 14px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Verify Code
              </button>
            </div>
            {otpError && <span className="auth-field-error" style={{ display: 'block', marginTop: '4px' }}>{otpError}</span>}
          </div>
        )}
        {fieldErrors.otp && <span className="auth-field-error">{fieldErrors.otp}</span>}
      </div>

      {/* Password Field */}
      <div className="auth-field-group">
        <label className="auth-label" htmlFor="register-password">
          Password *
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
          Confirm Password *
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
          <button type="button" className="auth-link" onClick={() => onSwitchToLogin()}>
            Sign in
          </button>
        </p>
      )}
    </form>
  );
}
