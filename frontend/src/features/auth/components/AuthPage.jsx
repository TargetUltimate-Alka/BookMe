import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthPage({ defaultTab = 'login', defaultRole = 'customer' }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'login' | 'register'
  const [selectedRole, setSelectedRole] = useState(defaultRole);

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-card-header">
          <div className="auth-logo-badge">B</div>
          <h1 className="auth-title">
            {activeTab === 'login' ? 'Welcome back to BookMe' : 'Join BookMe Platform'}
          </h1>
          <p className="auth-subtitle">
            {activeTab === 'login'
              ? 'Sign in to manage your events, budgets, and bookings'
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
            onClick={() => setActiveTab('register')}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        {activeTab === 'login' ? (
          <LoginForm onSwitchToRegister={() => setActiveTab('register')} />
        ) : (
          <RegisterForm
            onSwitchToLogin={() => setActiveTab('login')}
            initialRole={selectedRole}
          />
        )}
      </div>
    </div>
  );
}
