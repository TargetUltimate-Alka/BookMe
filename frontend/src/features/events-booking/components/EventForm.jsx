import React, { useState } from 'react';
import { formatCurrency } from '../utils/formatters.js';

const EVENT_TYPES = ['Wedding', 'Birthday', 'Corporate', 'Social', 'Other'];

export function EventForm({ initialValues, onSubmit, isSubmitting = false }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: initialValues?.name || '',
    event_type: initialValues?.event_type || 'Wedding',
    event_date: initialValues?.event_date ? initialValues.event_date.split('T')[0] : '',
    budget: initialValues?.budget || '',
    guest_count: initialValues?.guest_count || '',
    city: initialValues?.city || '',
  });

  const [errors, setErrors] = useState({});

  const todayStr = new Date().toISOString().split('T')[0];

  const validateStep1 = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Event name is required';
    if (!formData.event_type) errs.event_type = 'Event type is required';
    if (!formData.event_date) {
      errs.event_date = 'Event date is required';
    } else if (formData.event_date < todayStr) {
      errs.event_date = 'Event date cannot be in the past';
    }
    if (!formData.budget || Number(formData.budget) <= 0) {
      errs.budget = 'Please enter a valid budget greater than 0';
    }
    if (!formData.guest_count || Number(formData.guest_count) < 1) {
      errs.guest_count = 'Guest count must be at least 1';
    }
    if (!formData.city.trim()) {
      errs.city = 'City is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    onSubmit({
      ...formData,
      budget: Number(formData.budget),
      guest_count: Number(formData.guest_count),
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Wizard Step Indicators */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`eb-btn eb-btn-sm ${step === 1 ? 'eb-btn-primary' : 'eb-btn-secondary'}`}
          style={{ borderRadius: '9999px' }}
        >
          1. Event Details
        </button>
        <div style={{ width: '30px', height: '2px', background: '#e5e7eb' }} />
        <button
          type="button"
          onClick={handleNext}
          className={`eb-btn eb-btn-sm ${step === 2 ? 'eb-btn-primary' : 'eb-btn-secondary'}`}
          style={{ borderRadius: '9999px' }}
        >
          2. Review & AI Allocation
        </button>
      </div>

      {step === 1 && (
        <div className="eb-card">
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>
            Event Information
          </h3>

          <div className="eb-form-group">
            <label className="eb-label">Event Name *</label>
            <input
              type="text"
              className="eb-input"
              placeholder="e.g. Aarav & Maya Wedding Reception"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: null });
              }}
            />
            {errors.name && <div className="eb-error-text">{errors.name}</div>}
          </div>

          <div className="eb-grid eb-grid-2">
            <div className="eb-form-group">
              <label className="eb-label">Event Type *</label>
              <select
                className="eb-select"
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="eb-form-group">
              <label className="eb-label">Event Date *</label>
              <input
                type="date"
                className="eb-input"
                min={todayStr}
                value={formData.event_date}
                onChange={(e) => {
                  setFormData({ ...formData, event_date: e.target.value });
                  if (errors.event_date) setErrors({ ...errors, event_date: null });
                }}
              />
              {errors.event_date && <div className="eb-error-text">{errors.event_date}</div>}
            </div>
          </div>

          <div className="eb-grid eb-grid-3">
            <div className="eb-form-group">
              <label className="eb-label">Estimated Budget (₹) *</label>
              <input
                type="number"
                className="eb-input"
                placeholder="500000"
                min="1000"
                value={formData.budget}
                onChange={(e) => {
                  setFormData({ ...formData, budget: e.target.value });
                  if (errors.budget) setErrors({ ...errors, budget: null });
                }}
              />
              {errors.budget && <div className="eb-error-text">{errors.budget}</div>}
            </div>

            <div className="eb-form-group">
              <label className="eb-label">Guest Count *</label>
              <input
                type="number"
                className="eb-input"
                placeholder="150"
                min="1"
                value={formData.guest_count}
                onChange={(e) => {
                  setFormData({ ...formData, guest_count: e.target.value });
                  if (errors.guest_count) setErrors({ ...errors, guest_count: null });
                }}
              />
              {errors.guest_count && <div className="eb-error-text">{errors.guest_count}</div>}
            </div>

            <div className="eb-form-group">
              <label className="eb-label">City / Destination *</label>
              <input
                type="text"
                className="eb-input"
                placeholder="e.g. Ahmedabad, Mumbai"
                value={formData.city}
                onChange={(e) => {
                  setFormData({ ...formData, city: e.target.value });
                  if (errors.city) setErrors({ ...errors, city: null });
                }}
              />
              {errors.city && <div className="eb-error-text">{errors.city}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="eb-btn eb-btn-primary" onClick={handleNext}>
              Continue to AI Plan ➔
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="eb-card">
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>
            Review & Initialized Allocations
          </h3>
          <p style={{ margin: '0 0 1.25rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
            When you create this event, BookMe automatically provisions your checklist and splits your budget across standard recommended categories.
          </p>

          <div
            style={{
              background: '#f9fafb',
              padding: '1rem',
              borderRadius: '10px',
              border: '1px solid #f3f4f6',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#4b5563' }}>Event:</span>
              <strong>{formData.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#4b5563' }}>Date & Location:</span>
              <span>
                {formData.event_date} in {formData.city}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#4b5563' }}>Guests:</span>
              <span>{formData.guest_count} attendees</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem' }}>
              <span style={{ color: '#111827', fontWeight: 600 }}>Total Budget:</span>
              <strong style={{ color: '#4f46e5', fontSize: '1.1rem' }}>
                {formatCurrency(formData.budget)}
              </strong>
            </div>
          </div>

          <div className="eb-alert-banner eb-alert-success" style={{ margin: '0 0 1.5rem 0' }}>
            <span>
              ✨ <strong>Smart Template Active:</strong> Default budget categories (Venue, Catering, Photography, Decor, etc.) and pre-dated milestone checklists will be populated automatically.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="eb-btn eb-btn-secondary"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              ⬅ Back
            </button>
            <button
              type="submit"
              className="eb-btn eb-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Event...' : 'Confirm & Create Event'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
