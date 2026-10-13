/**
 * Integer Paise Monetary Arithmetic & UTC/IST Time Utilities (ADR-003, ADR-004, FR-VEN-05, FR-VEN-10, FR-VEN-11)
 * All monetary calculations strictly use integer paise (BigInt / safe integer math).
 */

function toIntegerPaise(paiseInput, fallbackInrInput) {
  if (paiseInput !== undefined && paiseInput !== null && paiseInput !== '') {
    const parsed = Number(paiseInput);
    if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
      throw new Error('Monetary paise value must be a non-negative integer');
    }
    return parsed;
  }
  if (fallbackInrInput !== undefined && fallbackInrInput !== null && fallbackInrInput !== '') {
    const parsedInr = Number(fallbackInrInput);
    if (!Number.isFinite(parsedInr) || parsedInr < 0) {
      throw new Error('Monetary price value must be a non-negative number');
    }
    return Math.round(parsedInr * 100);
  }
  return 0;
}

function paiseToInrNumber(paise) {
  const n = Number(paise || 0);
  return Math.round(n) / 100;
}

/**
 * Computes discounted price in integer paise given an original price in paise and applicable discounts.
 * Never uses floating-point arithmetic for currency outputs.
 */
function calculateDiscountedPricePaise(originalPricePaise, discounts = [], orderDateStr = null, promoCode = null) {
  const base = BigInt(Math.max(0, Math.trunc(Number(originalPricePaise || 0))));
  if (!Array.isArray(discounts) || discounts.length === 0) {
    return {
      originalPricePaise: Number(base),
      discountAmountPaise: 0,
      discountedPricePaise: Number(base),
      appliedDiscount: null,
    };
  }

  const checkDate = orderDateStr || new Date().toISOString().split('T')[0];
  let bestDiscountPaise = 0n;
  let bestDiscountObj = null;

  for (const d of discounts) {
    if (d.status && d.status !== 'ACTIVE') continue;
    if (d.startDate && checkDate < d.startDate) continue;
    if (d.endDate && checkDate > d.endDate) continue;

    // If discount requires a promo code, only apply when code matches or when evaluating general promo eligibility
    if (d.code && promoCode !== null && promoCode !== undefined) {
      if (String(d.code).toUpperCase() !== String(promoCode).toUpperCase()) {
        continue;
      }
    }

    const minOrder = BigInt(Math.max(0, Math.trunc(Number(d.minOrderPaise || 0))));
    if (base < minOrder) continue;

    let candidateDiscount = 0n;
    const dType = d.type || d.discountType;
    const dVal = d.value !== undefined ? d.value : d.discountValue;
    if (dType === 'PERCENT' || dType === 'PERCENTAGE') {
      // If d.discountType === 'PERCENTAGE', dVal is already in basis points (e.g. 1000 = 10%); if d.type === 'PERCENT', dVal is percent (e.g. 10 = 10%)
      const bps =
        d.discountType === 'PERCENTAGE' && Number(dVal) > 100
          ? BigInt(Math.max(0, Math.min(10000, Math.round(Number(dVal)))))
          : BigInt(Math.max(0, Math.min(10000, Math.round(Number(dVal || 0) * 100))));
      candidateDiscount = (base * bps) / 10000n;
    } else if (dType === 'FLAT' || dType === 'FLAT_PAISE') {
      const flatVal = d.valuePaise !== undefined ? d.valuePaise : dVal;
      candidateDiscount = BigInt(Math.max(0, Math.trunc(Number(flatVal || 0))));
    }

    if (candidateDiscount > base) {
      candidateDiscount = base;
    }

    if (candidateDiscount > bestDiscountPaise) {
      bestDiscountPaise = candidateDiscount;
      bestDiscountObj = d;
    }
  }

  const finalPaise = base - bestDiscountPaise;
  return {
    originalPricePaise: Number(base),
    discountAmountPaise: Number(bestDiscountPaise),
    discountedPricePaise: Number(finalPaise),
    appliedDiscount: bestDiscountObj
      ? {
          id: bestDiscountObj.id,
          type: bestDiscountObj.type || bestDiscountObj.discountType,
          value: bestDiscountObj.value ?? bestDiscountObj.discountValue,
          code: bestDiscountObj.code || bestDiscountObj.promoCode || null,
          scope: bestDiscountObj.scope,
        }
      : null,
  };
}

function toPaiseBigInt(val) {
  if (typeof val === 'bigint') return val < 0n ? 0n : val;
  const n = Math.max(0, Math.trunc(Number(val || 0)));
  return BigInt(n);
}

function calculateDiscountedPrice(basePricePaise, discountOrList) {
  const list = Array.isArray(discountOrList)
    ? discountOrList
    : discountOrList
      ? [discountOrList]
      : [];
  const res = calculateDiscountedPricePaise(Number(basePricePaise || 0), list);
  return {
    originalPricePaise: BigInt(res.originalPricePaise),
    discountPaise: BigInt(res.discountAmountPaise),
    finalPricePaise: BigInt(res.discountedPricePaise),
    appliedDiscount: res.appliedDiscount,
  };
}

/**
 * Computes GST breakdown in integer paise (FR-VEN-11).
 * Supports both tax-exclusive and tax-inclusive package presentation.
 */
function calculateGstBreakdownPaise(amountAfterDiscountPaise, gstRatePercent = 18, taxInclusive = false) {
  const amount = BigInt(Math.max(0, Math.trunc(Number(amountAfterDiscountPaise || 0))));
  const rateBps = BigInt(Math.max(0, Math.round(Number(gstRatePercent || 0) * 100)));

  if (rateBps === 0n) {
    return {
      taxableAmountPaise: Number(amount),
      gstRatePercent: Number(gstRatePercent || 0),
      gstAmountPaise: 0,
      totalWithGstPaise: Number(amount),
      taxInclusive: Boolean(taxInclusive),
    };
  }

  if (taxInclusive) {
    // amount = taxable * (10000 + rateBps) / 10000
    const taxable = (amount * 10000n) / (10000n + rateBps);
    const gst = amount - taxable;
    return {
      taxableAmountPaise: Number(taxable),
      gstRatePercent: Number(gstRatePercent),
      gstAmountPaise: Number(gst),
      totalWithGstPaise: Number(amount),
      taxInclusive: true,
    };
  } else {
    const gst = (amount * rateBps + 5000n) / 10000n;
    const total = amount + gst;
    return {
      taxableAmountPaise: Number(amount),
      gstRatePercent: Number(gstRatePercent),
      gstAmountPaise: Number(gst),
      totalWithGstPaise: Number(total),
      taxInclusive: false,
    };
  }
}

/**
 * Builds an immutable booking price, discount, tax, and terms snapshot (FR-VEN-10).
 */
function createImmutablePriceSnapshot({
  pkg,
  vendor,
  quantity = 1,
  selectedAddons = [],
  discount = null,
  discounts = [],
  promoCode = null,
  eventDate = null,
  agreementVersion = '1.0.0',
}) {
  const qty = BigInt(Math.max(1, Math.trunc(Number(quantity || 1))));
  const unitBasePaise = BigInt(Math.max(0, Math.trunc(Number(pkg.basePricePaise || 0))));
  const subtotalBasePaise = Number(unitBasePaise * qty);

  let addonsTotalPaise = 0n;
  const addonSnapshots = [];
  for (const addon of selectedAddons) {
    const addonUnitPaise = BigInt(Math.max(0, Math.trunc(Number(addon.pricePaise || 0))));
    const addonQty = BigInt(Math.max(1, Math.trunc(Number(addon.quantity || 1))));
    const linePaise = addonUnitPaise * addonQty;
    addonsTotalPaise += linePaise;
    addonSnapshots.push({
      id: addon.id,
      name: addon.name,
      pricingBasis: addon.pricingBasis || addon.priceUnit || 'flat',
      unitPricePaise: Number(addonUnitPaise),
      quantity: Number(addonQty),
      lineTotalPaise: Number(linePaise),
    });
  }

  const effectiveDiscounts =
    Array.isArray(discounts) && discounts.length > 0
      ? discounts
      : discount
        ? [discount]
        : [];

  const grossBeforeDiscountPaise = subtotalBasePaise + Number(addonsTotalPaise);
  const discountEval = calculateDiscountedPricePaise(
    grossBeforeDiscountPaise,
    effectiveDiscounts,
    eventDate,
    promoCode
  );

  const resolvedGstPercent =
    pkg.gstRatePercent !== undefined
      ? Number(pkg.gstRatePercent)
      : pkg.gstRateBps !== undefined
        ? Number(pkg.gstRateBps) / 100
        : 18;

  const gstEval = calculateGstBreakdownPaise(
    discountEval.discountedPricePaise,
    resolvedGstPercent,
    Boolean(pkg.taxInclusive)
  );

  const securityDepositPaise = Math.max(0, Math.trunc(Number(pkg.securityDepositPaise || 0)));
  const totalPayablePaise = gstEval.totalWithGstPaise + securityDepositPaise;
  const depositAmountPaise = Number((BigInt(totalPayablePaise) * 40n) / 100n);
  const balanceAmountPaise = totalPayablePaise - depositAmountPaise;

  return Object.freeze({
    snapshotId: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    snapshotCreatedAtUtc: new Date().toISOString(),
    vendorId: vendor ? vendor.id : pkg.vendorId,
    vendorBusinessName: vendor ? vendor.businessName : undefined,
    packageId: pkg.id,
    packageName: pkg.name,
    categoryId: pkg.categoryId || null,
    tier: pkg.tier || 'Standard',
    pricingUnit: pkg.pricingUnit || pkg.priceUnit || 'per_day',
    quantity: Number(qty),
    unitBasePricePaise: Number(unitBasePaise),
    subtotalBasePaise,
    baseSubtotalPaise: subtotalBasePaise,
    addons: addonSnapshots,
    addonsTotalPaise: Number(addonsTotalPaise),
    originalPricePaise: discountEval.originalPricePaise,
    discountAmountPaise: discountEval.discountAmountPaise,
    discountPaise: discountEval.discountAmountPaise,
    discountedPricePaise: discountEval.discountedPricePaise,
    discountedSubtotalPaise: discountEval.discountedPricePaise,
    appliedDiscount: discountEval.appliedDiscount,
    hsnSacCode: pkg.hsnSacCode || '998596',
    gstRatePercent: gstEval.gstRatePercent,
    taxInclusive: gstEval.taxInclusive,
    taxableAmountPaise: gstEval.taxableAmountPaise,
    gstAmountPaise: gstEval.gstAmountPaise,
    securityDepositPaise,
    totalPayablePaise,
    totalPayableInr: totalPayablePaise / 100,
    depositAmountPaise,
    balanceAmountPaise,
    inclusions: Array.isArray(pkg.inclusions) ? [...pkg.inclusions] : [],
    exclusions: Array.isArray(pkg.exclusions) ? [...pkg.exclusions] : [],
    overtimeRatePaise: Number(pkg.overtimeRatePaise || 0),
    termsVersion: agreementVersion,
  });
}

function nowUtcIso() {
  return new Date().toISOString();
}

function formatUtcToIst(utcDateInput) {
  if (!utcDateInput) return null;
  const d = new Date(utcDateInput);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }) + ' IST';
}

function enumerateDateRange(startDateStr, endDateStr) {
  if (!startDateStr) return [];
  const endStr = endDateStr || startDateStr;
  const start = new Date(`${startDateStr}T00:00:00.000Z`);
  const end = new Date(`${endStr}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }
  const dates = [];
  const cur = new Date(start);
  let safety = 0;
  while (cur <= end && safety < 366) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
    safety++;
  }
  return dates;
}

/**
 * Computes spherical distance in kilometers using Haversine formula.
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null || lat1 === undefined ||
    lon1 === null || lon1 === undefined ||
    lat2 === null || lat2 === undefined ||
    lon2 === null || lon2 === undefined
  ) {
    return null;
  }
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if ([nLat1, nLon1, nLat2, nLon2].some((v) => !Number.isFinite(v))) return null;

  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(nLat2 - nLat1);
  const dLon = toRad(nLon2 - nLon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(nLat1)) * Math.cos(toRad(nLat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

module.exports = {
  toIntegerPaise,
  toPaiseBigInt,
  paiseToInrNumber,
  calculateDiscountedPricePaise,
  calculateDiscountedPrice,
  calculateGstBreakdownPaise,
  createImmutablePriceSnapshot,
  nowUtcIso,
  formatUtcToIst,
  enumerateDateRange,
  calculateDistanceKm,
};
