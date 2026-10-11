/**
 * BookMe Vendor Service Frontend API Client (Person B)
 * Connects React UI to Express backend running on http://localhost:3002
 */

export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.REACT_APP_VENDOR_API_URL) ||
  'http://localhost:3002/api/vendors';

export const HEALTH_URL = 'http://localhost:3002/health';

/**
 * Checks if the backend vendor-service is reachable.
 */
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(HEALTH_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Fetch list of vendors with optional filtering (category, location, page).
 */
export async function fetchVendors(params = {}) {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'all') query.append('category', params.category);
  if (params.location) query.append('location', params.location);
  if (params.page) query.append('page', params.page);

  const url = `${API_BASE_URL}${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch vendors: ${res.statusText}`);
  return await res.json();
}

/**
 * Fetch detailed vendor profile by ID.
 */
export async function fetchVendorById(vendorId) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}`);
  if (!res.ok) throw new Error(`Vendor ${vendorId} not found`);
  return await res.json();
}

/**
 * Create a new vendor profile.
 */
export async function createVendor(vendorData) {
  const res = await fetch(`${API_BASE_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vendorData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create vendor');
  }
  return await res.json();
}

/**
 * Fetch all services for a specific vendor.
 */
export async function fetchVendorServices(vendorId) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/services`);
  if (!res.ok) throw new Error('Failed to fetch services');
  return await res.json();
}

/**
 * Create a new service offering for a vendor.
 */
export async function createVendorService(vendorId, serviceData) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serviceData),
  });
  if (!res.ok) throw new Error('Failed to create service');
  return await res.json();
}

/**
 * Fetch all packages for a specific vendor.
 */
export async function fetchVendorPackages(vendorId) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/packages`);
  if (!res.ok) throw new Error('Failed to fetch packages');
  return await res.json();
}

/**
 * Create a new bundled package for a vendor.
 */
export async function createVendorPackage(vendorId, packageData) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(packageData),
  });
  if (!res.ok) throw new Error('Failed to create package');
  return await res.json();
}

/**
 * Check vendor availability for a given date.
 */
export async function fetchAvailability(vendorId, dateStr) {
  const query = dateStr ? `?date=${dateStr}` : '';
  const res = await fetch(`${API_BASE_URL}/${vendorId}/availability${query}`);
  if (!res.ok) throw new Error('Failed to check availability');
  return await res.json();
}

/**
 * Block a date on the vendor's calendar.
 */
export async function blockDate(vendorId, { date, reason }) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/availability/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, reason }),
  });
  if (!res.ok) throw new Error('Failed to block date');
  return await res.json();
}

/**
 * Unblock a previously blocked slot on the calendar.
 */
export async function unblockDate(vendorId, blockId) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/availability/block/${blockId}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) throw new Error('Failed to unblock date');
  return true;
}
