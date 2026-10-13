/**
 * SRS §2.3 Admin-Editable CONFIG Parameters (never hard-coded in business logic)
 */

const DEFAULT_CONFIGS = [
  {
    key: 'QUALIFYING_CALL_MIN_SECONDS',
    value: '30',
    description: 'Minimum connected duration in seconds for a customer-initiated call to count as a billable lead',
  },
  {
    key: 'LEAD_FEE_PAISE',
    value: '2500',
    description: 'Base fee per qualified lead in paise (₹25 = 2500 paise) before GST',
  },
  {
    key: 'LEAD_GST_PERCENT',
    value: '18',
    description: 'GST percentage applied to platform lead fees',
  },
  {
    key: 'LEAD_DEDUP_DAYS',
    value: '7',
    description: 'Window in days during which at most one billable lead is charged per customer-vendor pair',
  },
  {
    key: 'CUSTOMER_DAILY_LEAD_CAP',
    value: '10',
    description: 'Maximum billable leads a single customer can generate per day',
  },
  {
    key: 'INITIAL_VENDOR_TOPUP_PAISE',
    value: '100000',
    description: 'Recommended initial vendor wallet top-up in paise (₹1,000 = 100000 paise)',
  },
  {
    key: 'MINIMUM_WALLET_BALANCE_PAISE',
    value: '50000',
    description: 'Minimum vendor wallet balance in paise required to appear in live search (₹500 = 50000 paise)',
  },
  {
    key: 'WALLET_ALERT_150_PERCENT_PAISE',
    value: '75000',
    description: '150% low-balance alert threshold in paise (₹750 = 75000 paise)',
  },
  {
    key: 'WALLET_ALERT_100_PERCENT_PAISE',
    value: '50000',
    description: '100% minimum-balance alert threshold in paise (₹500 = 50000 paise)',
  },
  {
    key: 'LOW_BALANCE_GRACE_PERIOD_HOURS',
    value: '48',
    description: 'Grace period in hours before a vendor below minimum wallet balance is hidden from search',
  },
  {
    key: 'VENDOR_RESPONSE_WINDOW_HOURS',
    value: '12',
    description: 'Standard vendor booking response window in hours',
  },
  {
    key: 'VENDOR_URGENT_RESPONSE_WINDOW_HOURS',
    value: '2',
    description: 'Urgent vendor response window in hours when event starts within 24 hours',
  },
  {
    key: 'MAX_COUNTER_OFFERS',
    value: '3',
    description: 'Maximum structured counter-offers per booking',
  },
  {
    key: 'COUNTER_OFFER_VALID_HOURS',
    value: '6',
    description: 'Validity duration in hours for each counter-offer',
  },
  {
    key: 'DEPOSIT_PERCENT',
    value: '40',
    description: 'Deposit percentage payable upon vendor acceptance',
  },
  {
    key: 'BALANCE_PERCENT',
    value: '60',
    description: 'Balance percentage payable 48 hours before event start',
  },
  {
    key: 'MAX_SECURITY_DEPOSIT_PAISE',
    value: '5000000',
    description: 'Maximum refundable security deposit allowed on a package in paise (₹50,000 = 5000000 paise)',
  },
  {
    key: 'REQUIRED_AGREEMENT_VERSION',
    value: '1.0.0',
    description: 'Current vendor agreement version required for a vendor to go live',
  },
  {
    key: 'MIN_PACKAGE_PHOTOS',
    value: '3',
    description: 'Minimum number of validated photos required to publish a package (FR-VEN-02)',
  },
  {
    key: 'MIN_PACKAGE_VIDEOS',
    value: '1',
    description: 'Minimum number of validated videos required to publish a package (FR-VEN-02)',
  },
  {
    key: 'MAX_IMAGE_SIZE_BYTES',
    value: '5242880',
    description: 'Maximum image upload size in bytes (5 MB = 5,242,880 bytes)',
  },
  {
    key: 'MAX_VIDEO_SIZE_BYTES',
    value: '20971520',
    description: 'Maximum video upload size in bytes (20 MB = 20,971,520 bytes)',
  },
  {
    key: 'MIN_VIDEO_DURATION_SECONDS',
    value: '5',
    description: 'Minimum allowed video duration in seconds (FR-VEN-02)',
  },
  {
    key: 'MAX_VIDEO_DURATION_SECONDS',
    value: '10',
    description: 'Maximum allowed video duration in seconds (FR-VEN-02)',
  },
  {
    key: 'NOTIFY_ME_DAILY_CAP_PER_ITEM',
    value: '3',
    description: 'Maximum Notify-Me alerts sent per customer item per day (FR-NOT-02)',
  },
];

module.exports = {
  DEFAULT_CONFIGS,
};
