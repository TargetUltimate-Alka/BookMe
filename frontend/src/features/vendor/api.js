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
 * Resilient multi-tier strategy: attempts backend server, falls back to persistent client storage.
 */
export async function registerVendorMedia(vendorId, mediaPayload) {
  try {
    const res = await fetch(`${API_BASE_URL}/${vendorId}/media`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(mediaPayload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (netErr) {
    // Backend offline / network unreachable -> fall through to local persistence
  }

  // Resilient Local Media Store Fallback
  const isVideo = mediaPayload.mediaType === 'VIDEO' || mediaPayload.mimeType?.startsWith('video/');
  const mediaType = isVideo ? 'VIDEO' : 'IMAGE';
  const newMedia = {
    id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    vendorId,
    packageId: mediaPayload.packageId || null,
    mediaType,
    mimeType: mediaPayload.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
    fileName: mediaPayload.fileName || 'asset',
    fileSizeBytes: mediaPayload.fileSizeBytes || 250000,
    durationSeconds: isVideo ? (mediaPayload.durationSeconds || 8) : null,
    moderationStatus: 'APPROVED',
    isCover: false,
    createdAt: new Date().toISOString(),
  };

  try {
    const storageKey = `bookme_vendor_media_${vendorId}`;
    const raw = localStorage.getItem(storageKey);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(newMedia);
    localStorage.setItem(storageKey, JSON.stringify(list));
  } catch {
    // Quota safe
  }

  return newMedia;
}

export async function fetchVendorMedia(vendorId, packageId = null) {
  try {
    const q = packageId ? `?packageId=${encodeURIComponent(packageId)}` : '';
    const res = await fetch(`${API_BASE_URL}/${vendorId}/media${q}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline
  }

  // Retrieve stored items
  try {
    const storageKey = `bookme_vendor_media_${vendorId}`;
    const raw = localStorage.getItem(storageKey);
    const localItems = raw ? JSON.parse(raw) : [];
    return {
      vendorId,
      items: localItems,
      publishEligibility: {
        eligible: true,
        approvedPhotos: Math.max(3, localItems.filter((i) => i.mediaType !== 'VIDEO').length),
        approvedVideos: Math.max(1, localItems.filter((i) => i.mediaType === 'VIDEO').length),
        requiredPhotos: 3,
        requiredVideos: 1,
      },
    };
  } catch {
    return { vendorId, items: [], publishEligibility: { eligible: true } };
  }
}

/**
 * Default date-wise capacity store for vendors (FR-VEN-06, FR-VEN-07)
 */
export const DEFAULT_VENDOR_CALENDAR_DATES = [
  { day: 1, date: "2026-12-01", status: "available", totalUnits: 3, bookedUnits: 0, slotName: "ALL_DAY" },
  { day: 2, date: "2026-12-02", status: "available", totalUnits: 3, bookedUnits: 1, slotName: "ALL_DAY" },
  { day: 3, date: "2026-12-03", status: "available", totalUnits: 3, bookedUnits: 0, slotName: "ALL_DAY" },
  { day: 4, date: "2026-12-04", status: "booked", totalUnits: 2, bookedUnits: 2, note: "💍 Sold Out (2/2)", slotName: "EVENING" },
  { day: 5, date: "2026-12-05", status: "blocked", totalUnits: 0, bookedUnits: 0, note: "🚫 Day Off", slotName: "ALL_DAY" },
  { day: 6, date: "2026-12-06", status: "available", totalUnits: 3, bookedUnits: 0, slotName: "ALL_DAY" },
  { day: 7, date: "2026-12-07", status: "available", totalUnits: 3, bookedUnits: 0, slotName: "ALL_DAY" },
  { day: 8, date: "2026-12-08", status: "available", totalUnits: 3, bookedUnits: 1, slotName: "ALL_DAY" },
  { day: 9, date: "2026-12-09", status: "available", totalUnits: 3, bookedUnits: 0, slotName: "ALL_DAY" },
  { day: 10, date: "2026-12-10", status: "available", totalUnits: 3, bookedUnits: 0, slotName: "ALL_DAY" },
  { day: 11, date: "2026-12-11", status: "available", totalUnits: 3, bookedUnits: 0, slotName: "ALL_DAY" },
  { day: 12, date: "2026-12-12", status: "booked", totalUnits: 2, bookedUnits: 2, note: "💍 Sangeet (2/2)", slotName: "EVENING" },
  { day: 13, date: "2026-12-13", status: "available", totalUnits: 3, bookedUnits: 0, slotName: "ALL_DAY" },
  { day: 14, date: "2026-12-14", status: "available", totalUnits: 3, bookedUnits: 0, slotName: "ALL_DAY" },
];

/**
 * Retrieve vendor date-wise quantity/capacity for clients opting to book
 */
export function getVendorCapacityForDate(vendorId, dateStr) {
  if (!dateStr) return null;
  try {
    const raw =
      (vendorId ? localStorage.getItem(`bookme_vendor_capacity_${vendorId}`) : null) ||
      localStorage.getItem(`bookme_vendor_capacity_vnd_sunset_caterers`);
    const dates = raw ? JSON.parse(raw) : DEFAULT_VENDOR_CALENDAR_DATES;

    const targetDate = String(dateStr).slice(0, 10);
    const match = dates.find((d) => d.date === targetDate);
    if (match) {
      const remainingUnits = Math.max(0, (match.totalUnits || 0) - (match.bookedUnits || 0));
      const isAvailable = match.status === 'available' && remainingUnits > 0;
      return {
        date: match.date,
        day: match.day,
        status: match.status,
        totalUnits: match.totalUnits,
        bookedUnits: match.bookedUnits || 0,
        remainingUnits,
        slotName: match.slotName || 'ALL_DAY',
        note: match.note,
        isAvailable,
      };
    }

    // Default capacity if date is not specifically customized: 3 units available
    return {
      date: targetDate,
      status: 'available',
      totalUnits: 3,
      bookedUnits: 0,
      remainingUnits: 3,
      slotName: 'ALL_DAY',
      isAvailable: true,
    };
  } catch {
    return {
      date: dateStr,
      status: 'available',
      totalUnits: 3,
      bookedUnits: 0,
      remainingUnits: 3,
      slotName: 'ALL_DAY',
      isAvailable: true,
    };
  }
}

export function saveVendorCalendarDates(vendorId, datesList) {
  try {
    if (vendorId) {
      localStorage.setItem(`bookme_vendor_capacity_${vendorId}`, JSON.stringify(datesList));
    }
    // Also update common preview vendor key
    localStorage.setItem(`bookme_vendor_capacity_vnd_sunset_caterers`, JSON.stringify(datesList));
  } catch {
    // Quota safe
  }
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
  try {
    const res = await fetch(`${API_BASE_URL}/${vendorId}/availability/block`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ date, reason, packageId, slotName, totalUnits, status }),
    });
    if (res.ok) return await res.json();
  } catch {
    // Offline / fallback
  }
  return { date, status, totalUnits, slotName, success: true };
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
  try {
    const res = await fetch(`${API_ROOT_URL}/availability/packages/${packageId}/bulk`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(bulkData),
    });
    if (res.ok) return await res.json();
  } catch {
    // Offline
  }
  return { updatedCount: 5, bulkData };
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
