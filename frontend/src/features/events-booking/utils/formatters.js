/**
 * Formatting utilities for BookMe Event & Booking features
 */

/**
 * Format currency in Indian Rupees (en-IN)
 * e.g. 500000 -> ₹5,00,000
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

/**
 * Format date string into DD MMM YYYY (e.g. 15 Dec 2026)
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Calculate days remaining until date
 */
export function getDaysRemaining(dateStr) {
  if (!dateStr) return null;
  try {
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
