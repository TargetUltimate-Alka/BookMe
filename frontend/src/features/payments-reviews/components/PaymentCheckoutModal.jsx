import React, { useState, useEffect } from 'react';
import { paymentsApi } from '../api/paymentsApi.js';
import '../payments.css';

export function PaymentCheckoutModal({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess,
}) {
  const [step, setStep] = useState('details'); // 'details' | 'auth_challenge' | 'success'
  const [method, setMethod] = useState('card'); // 'card' | 'upi' | 'netbanking'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Card details
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4242');
  const [cardholderName, setCardholderName] = useState('Alka Sharma');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');

  // UPI details
  const [upiId, setUpiId] = useState('customer@okhdfcbank');

  // Netbanking details
  const [bank, setBank] = useState('HDFC Bank');

  // Authentication challenge state
  const [paymentData, setPaymentData] = useState(null);
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(30);

  // Format currency
  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0);

  const price =
    booking?.amount !== undefined
      ? Number(booking.amount)
      : Number(booking?.price_snapshot || 50000);

  const vendorName =
    booking?.vendor_name || booking?.vendor_name_snapshot || 'BookMe Vendor';
  const packageName =
    booking?.package_name || booking?.package_name_snapshot || 'Event Service Package';

  // Card brand detector
  const getCardBrand = (num) => {
    const clean = num.replace(/\s+/g, '');
    if (/^4/.test(clean)) return 'Visa';
    if (/^5[1-5]/.test(clean)) return 'Mastercard';
    if (/^6(011|5)/.test(clean)) return 'RuPay';
    if (/^3[47]/.test(clean)) return 'Amex';
    return 'Card';
  };

  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    val = val.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(val);
  };

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 2) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setExpiry(val);
  };

  // Timer for OTP
  useEffect(() => {
    let timer;
    if (step === 'auth_challenge' && resendTimer > 0) {
      timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  if (!isOpen) return null;

  // Step 1: Initiate Payment
  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        bookingId: booking?.id || `bkg_sim_${Date.now()}`,
        amount: price,
        method,
        paymentDetails: {
          cardNumber: cardNumber.replace(/\s+/g, ''),
          cardholderName,
          cardBrand: getCardBrand(cardNumber),
          expiry,
          upiId: method === 'upi' ? upiId : undefined,
          bank: method === 'netbanking' ? bank : undefined,
        },
      };

      const initiated = await paymentsApi.initiatePayment(payload);
      setPaymentData(initiated);
      setStep('auth_challenge');
      setOtp('123456'); // Pre-fill with sandbox OTP for user convenience
      setResendTimer(30);
    } catch (err) {
      setError(err.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Authenticate Payment with OTP / 2FA
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!paymentData?.id) return;

    setLoading(true);
    setError(null);

    try {
      const verified = await paymentsApi.authenticatePayment(paymentData.id, {
        otp: otp.trim(),
      });

      setPaymentData((prev) => ({ ...prev, ...verified, status: 'success' }));
      setStep('success');

      if (onPaymentSuccess) {
        onPaymentSuccess({
          ...booking,
          status: 'CONFIRMED',
          paymentId: verified.id,
          receiptNumber: verified.receiptNumber,
        });
      }
    } catch (err) {
      setError(err.message || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pay-modal-overlay">
      <div className="pay-modal-card">
        {/* Header */}
        <div className="pay-modal-header">
          <h2 className="pay-modal-title">
            🔒 Secure Payment Authentication
          </h2>
          <button
            type="button"
            className="pay-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="pay-modal-body">
          {/* Order Summary */}
          <div className="pay-order-summary">
            <div className="pay-order-info">
              <div className="pay-order-title">{vendorName}</div>
              <div className="pay-order-sub">
                {packageName} &bull; Ref: <code>{booking?.id || 'Booking'}</code>
              </div>
            </div>
            <div className="pay-order-amount">
              <div className="pay-order-amount-label">Amount Due</div>
              <div className="pay-order-amount-val">{formatCurrency(price)}</div>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #f87171',
                borderRadius: '8px',
                padding: '0.75rem',
                color: '#991b1b',
                fontSize: '0.85rem',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* STEP 1: PAYMENT METHOD SELECTION & DETAILS */}
          {step === 'details' && (
            <form onSubmit={handleInitiatePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Method Selector */}
              <div className="pay-methods-tabs">
                <button
                  type="button"
                  className={`pay-method-tab ${method === 'card' ? 'active' : ''}`}
                  onClick={() => setMethod('card')}
                >
                  💳 Debit / Credit Card
                </button>
                <button
                  type="button"
                  className={`pay-method-tab ${method === 'upi' ? 'active' : ''}`}
                  onClick={() => setMethod('upi')}
                >
                  📱 UPI / QR
                </button>
                <button
                  type="button"
                  className={`pay-method-tab ${method === 'netbanking' ? 'active' : ''}`}
                  onClick={() => setMethod('netbanking')}
                >
                  🏦 Net Banking
                </button>
              </div>

              {/* CARD METHOD */}
              {method === 'card' && (
                <>
                  <div className="pay-card-visual">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="pay-card-chip"></span>
                      <strong style={{ fontSize: '1rem', letterSpacing: '1px' }}>
                        {getCardBrand(cardNumber)}
                      </strong>
                    </div>
                    <div className="pay-card-num">{cardNumber || '•••• •••• •••• ••••'}</div>
                    <div className="pay-card-meta">
                      <div>
                        <span>Cardholder</span>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>
                          {cardholderName || 'CARDHOLDER NAME'}
                        </div>
                      </div>
                      <div>
                        <span>Expires</span>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{expiry || 'MM/YY'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pay-form-group">
                    <label className="pay-label">Card Number</label>
                    <input
                      type="text"
                      className="pay-input"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      required
                    />
                  </div>

                  <div className="pay-form-group">
                    <label className="pay-label">Cardholder Name</label>
                    <input
                      type="text"
                      className="pay-input"
                      placeholder="Full Name as on card"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="pay-row">
                    <div className="pay-form-group">
                      <label className="pay-label">Expiry (MM/YY)</label>
                      <input
                        type="text"
                        className="pay-input"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={handleExpiryChange}
                        required
                      />
                    </div>
                    <div className="pay-form-group">
                      <label className="pay-label">CVV</label>
                      <input
                        type="password"
                        maxLength="4"
                        className="pay-input"
                        placeholder="•••"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* UPI METHOD */}
              {method === 'upi' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="pay-form-group">
                    <label className="pay-label">UPI ID / Virtual Payment Address (VPA)</label>
                    <input
                      type="text"
                      className="pay-input"
                      placeholder="yourname@bank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['@okhdfcbank', '@okaxis', '@oksbi', '@paytm', '@ybl'].map((suffix) => (
                      <button
                        key={suffix}
                        type="button"
                        className="pay-btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => {
                          const prefix = upiId.includes('@') ? upiId.split('@')[0] : upiId;
                          setUpiId(`${prefix}${suffix}`);
                        }}
                      >
                        {suffix}
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📱</div>
                    <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                      Instant UPI 2-Factor Mandate
                    </strong>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                      After continuing, you'll confirm 2FA authentication to instantly lock and confirm your date.
                    </p>
                  </div>
                </div>
              )}

              {/* NET BANKING METHOD */}
              {method === 'netbanking' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="pay-form-group">
                    <label className="pay-label">Select Your Bank</label>
                    <select
                      className="pay-input"
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                    >
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="State Bank of India">State Bank of India (SBI)</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      <option value="Punjab National Bank">Punjab National Bank</option>
                    </select>
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '1rem',
                      fontSize: '0.85rem',
                      color: '#475569',
                    }}
                  >
                    🔒 You will be routed through {bank}'s official 2FA authentication gateway to finalize your reservation.
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="pay-btn-submit"
                disabled={loading}
              >
                {loading ? 'Initiating Gateway...' : `Proceed to 2FA Authentication (${formatCurrency(price)})`}
              </button>

              <div className="pay-security-badge">
                🛡️ 256-bit SSL Encrypted &bull; PCI-DSS Level 1 Compliant Sandbox
              </div>
            </form>
          )}

          {/* STEP 2: 2FA / OTP AUTHENTICATION CHALLENGE */}
          {step === 'auth_challenge' && (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="pay-otp-box">
                <span className="pay-otp-badge">
                  🛡️ 3D Secure 2.0 / 2FA Challenge
                </span>

                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                  {paymentData?.authChallenge?.message || 'Enter verification code sent to your device'}
                </div>

                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Destination: <strong>{paymentData?.authChallenge?.destination || '+91 ******8921'}</strong>
                </div>

                <input
                  type="text"
                  maxLength="6"
                  className="pay-otp-input"
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />

                <div className="pay-test-tip">
                  💡 <strong>Demo Sandbox Mode:</strong> Use test OTP code{' '}
                  <strong style={{ textDecoration: 'underline' }}>123456</strong> to authenticate.
                </div>

                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {resendTimer > 0 ? (
                    <span>Resend code in {resendTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      className="pay-btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => setResendTimer(30)}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="pay-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setStep('details')}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="pay-btn-submit"
                  style={{ flex: 2 }}
                  disabled={loading || otp.length < 4}
                >
                  {loading ? 'Authenticating...' : 'Authorize & Pay'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: PAYMENT SUCCESS / RECEIPT */}
          {step === 'success' && (
            <div className="pay-success-wrap">
              <div className="pay-success-icon">✓</div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a' }}>
                Payment Authenticated!
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                Your payment was successfully authorized. Your booking is now <strong>CONFIRMED</strong>!
              </p>

              <div className="pay-receipt-table">
                <div className="pay-receipt-row">
                  <span style={{ color: '#64748b' }}>Payment ID</span>
                  <code>{paymentData?.id || 'pay_001'}</code>
                </div>
                <div className="pay-receipt-row">
                  <span style={{ color: '#64748b' }}>Gateway Ref</span>
                  <code>{paymentData?.gatewayRef || 'sandbox_txn'}</code>
                </div>
                <div className="pay-receipt-row">
                  <span style={{ color: '#64748b' }}>Receipt #</span>
                  <strong>{paymentData?.receiptNumber || 'REC-BOOKME'}</strong>
                </div>
                <div className="pay-receipt-row">
                  <span style={{ color: '#64748b' }}>Payment Method</span>
                  <span style={{ textTransform: 'capitalize' }}>{method}</span>
                </div>
                <div className="pay-receipt-row total">
                  <span>Amount Paid</span>
                  <span>{formatCurrency(price)}</span>
                </div>
              </div>

              <button
                type="button"
                className="pay-btn-submit"
                style={{ width: '100%', marginTop: '0.5rem' }}
                onClick={() => {
                  onClose();
                }}
              >
                View Confirmed Booking ➔
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
