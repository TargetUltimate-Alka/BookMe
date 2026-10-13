/**
 * BookMe Vendor Service Frontend API Client (SRS v1.0 Complete Vendor Module)
 * Connects React UI to Express backend running on http://localhost:3002
 */

const ENV_ROOT =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VENDOR_ROOT_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_VENDOR_ROOT_URL);

const ENV_API =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VENDOR_API_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_VENDOR_API_URL);

export const API_ROOT_URL = ENV_ROOT || '/api';
export const API_BASE_URL = ENV_API || '/api/vendors';
export const DIRECT_BACKEND_URL = 'http://localhost:3002/api/vendors';
export const HEALTH_URL = 'http://localhost:3002/health';

function buildHeaders(extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (typeof window !== 'undefined') {
    const token = window.localStorage?.getItem('bookme_token');
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

/**
 * Checks if the backend vendor-service is reachable.
 */
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    // Try proxy endpoint first, fallback to direct port 3002
    let res = null;
    try {
      res = await fetch('/api/vendors?limit=1', { signal: controller.signal });
    } catch {
      res = await fetch(HEALTH_URL, { signal: controller.signal });
    }
    clearTimeout(timeoutId);
    return Boolean(res && res.ok);
  } catch {
    return false;
  }
}

/**
 * Fetch 60 SRS service categories across 8 parent domains.
 */
export async function fetchCategories(flat = false) {
  const res = await fetch(`${API_ROOT_URL}/categories${flat ? '?flat=true' : ''}`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return await res.json();
}

/**
 * Fetch list of vendors with full SRS search filtering:
 * q, category, location, lat, lng, radiusKm, date, startDate, endDate, slotName,
 * requiredQty, guestCount, minRating, minPrice, maxPrice, hasDiscount, includeDemo, sortBy, page, limit
 */
export async function fetchVendors(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && !(k === 'category' && v === 'all')) {
      query.append(k, String(v));
    }
  });

  const queryStr = query.toString() ? `?${query.toString()}` : '';
  const url = `${API_BASE_URL}${queryStr}`;

  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (err) {
    // Try direct backend url if proxy or relative path fails
    try {
      const directUrl = `${DIRECT_BACKEND_URL}${queryStr}`;
      const directRes = await fetch(directUrl);
      if (directRes.ok) return await directRes.json();
    } catch {
      // Both network calls failed
    }
    throw err;
  }

  throw new Error('Failed to fetch vendors');
}

/**
 * Fetch detailed vendor profile by ID.
 */
export async function fetchVendorById(vendorId, fullDetail = true) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}${fullDetail ? '?detail=true' : ''}`);
  if (!res.ok) throw new Error(`Vendor ${vendorId} not found`);
  return await res.json();
}

/**
 * Create a new vendor profile or onboarding draft.
 */
export async function createVendor(vendorData) {
  const res = await fetch(`${API_BASE_URL}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(vendorData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create vendor');
  }
  return await res.json();
}

export async function updateVendorProfile(vendorId, updateData) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(updateData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update vendor profile');
  }
  return await res.json();
}

/**
 * Onboarding, KYC & E-Sign Agreement APIs (FR-ONB-02, FR-ONB-03, FR-ONB-04, FR-ONB-06)
 */
export async function fetchKycStatus(vendorId) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/kyc/status`, {
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch KYC status');
  return await res.json();
}

export async function completeDigiLockerKyc(vendorId, payload) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/kyc/digilocker/callback`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'DigiLocker verification failed');
  }
  return await res.json();
}

export async function verifyPanKyc(vendorId, payload) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/kyc/pan/verify`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'PAN verification failed');
  }
  return await res.json();
}

export async function verifyBankPennyDrop(vendorId, payload) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/kyc/bank/penny-drop`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Bank penny-drop verification failed');
  }
  return await res.json();
}

export async function signVendorAgreement(vendorId, payload = { agreementVersion: 'v1.0', accepted: true }) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/agreement/esign`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Agreement e-sign failed');
  }
  return await res.json();
}

export async function submitVendorForReview(vendorId) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/submit`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Submit for review failed');
  }
  return await res.json();
}

/**
 * Services & Packages APIs (FR-VEN-03, FR-VEN-04, FR-VEN-05)
 */
export async function fetchVendorServices(vendorId) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/services`);
  if (!res.ok) throw new Error('Failed to fetch services');
  return await res.json();
}

export async function createVendorService(vendorId, serviceData) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/services`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(serviceData),
  });
  if (!res.ok) throw new Error('Failed to create service');
  return await res.json();
}

export async function fetchVendorPackages(vendorId) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/packages`);
  if (!res.ok) throw new Error('Failed to fetch packages');
  return await res.json();
}

export async function createVendorPackage(vendorId, packageData) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/packages`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(packageData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create package');
  }
  return await res.json();
}

export async function publishVendorPackage(vendorId, packageId) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/packages/${packageId}/publish`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Package publish requirements unmet');
  }
  return await res.json();
}

export async function addPackageAddon(vendorId, packageId, addonData) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/packages/${packageId}/addons`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(addonData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to add package add-on');
  }
  return await res.json();
}

export async function createVendorDiscount(vendorId, discountData) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/discounts`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(discountData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create discount');
  }
  return await res.json();
}

export async function fetchVendorDiscounts(vendorId) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/discounts`);
  if (!res.ok) throw new Error('Failed to fetch discounts');
  return await res.json();
}

/**
 * Media Upload & Moderation APIs (FR-VEN-02)
 */
export async function registerVendorMedia(vendorId, mediaPayload) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/media`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(mediaPayload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Media validation failed');
  }
  return await res.json();
}

export async function fetchVendorMedia(vendorId, packageId = null) {
  const q = packageId ? `?packageId=${encodeURIComponent(packageId)}` : '';
  const res = await fetch(`${API_BASE_URL}/${vendorId}/media${q}`);
  if (!res.ok) throw new Error('Failed to fetch media');
  return await res.json();
}

/**
 * Availability & Package Capacity APIs (FR-VEN-06, FR-VEN-07)
 */
export async function fetchAvailability(vendorId, dateStr) {
  const query = dateStr ? `?date=${dateStr}` : '';
  const res = await fetch(`${API_BASE_URL}/${vendorId}/availability${query}`);
  if (!res.ok) throw new Error('Failed to check availability');
  return await res.json();
}

export async function blockDate(vendorId, { date, reason, packageId, slotName, totalUnits, status }) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/availability/block`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ date, reason, packageId, slotName, totalUnits, status }),
  });
  if (!res.ok) throw new Error('Failed to block date');
  return await res.json();
}

export async function unblockDate(vendorId, blockId) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/availability/block/${blockId}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  if (!res.ok && res.status !== 204) throw new Error('Failed to unblock date');
  return true;
}

export async function setPackageAvailability(packageId, slotData) {
  const res = await fetch(`${API_ROOT_URL}/availability/packages/${packageId}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(slotData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update package capacity');
  }
  return await res.json();
}

export async function bulkSetPackageAvailability(packageId, bulkData) {
  const res = await fetch(`${API_ROOT_URL}/availability/packages/${packageId}/bulk`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(bulkData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to bulk update package capacity');
  }
  return await res.json();
}

/**
 * Wallet & Notify Me APIs (FR-WAL-01..04, FR-SRCH-05)
 */
export async function fetchVendorWallet(vendorId) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/wallet`, {
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch wallet');
  return await res.json();
}

export async function topupVendorWallet(vendorId, amountPaise) {
  const res = await fetch(`${API_BASE_URL}/${vendorId}/wallet/topup`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ amountPaise }),
  });
  if (!res.ok) throw new Error('Failed to top up wallet');
  return await res.json();
}

export async function createNotifyRequest(payload) {
  const res = await fetch(`${API_ROOT_URL}/notify-requests`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to register Notify Me request');
  }
  return await res.json();
}
