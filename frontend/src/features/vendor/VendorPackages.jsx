import { useState, useEffect } from "react";
import {
  fetchVendorPackages,
  createVendorPackage,
  publishVendorPackage,
  addPackageAddon,
  createVendorDiscount,
  fetchVendorDiscounts,
} from "./api";

const DEFAULT_VENDOR_ID = "vnd_sunset_caterers";

export default function VendorPackages({ vendorId = DEFAULT_VENDOR_ID }) {
  const [form, setForm] = useState({
    name: "Signature 5-Course Royal Wedding Buffet",
    tier: "Premium",
    priceInr: 45000,
    priceUnit: "PER_DAY",
    minGuests: 100,
    maxGuests: 800,
    durationHours: 8,
    overtimeRateInr: 3000,
    totalCapacityUnits: 2,
    securityDepositInr: 10000,
    gstRatePercent: 18,
    hsnSacCode: "996337",
    taxInclusive: false,
    inclusionsText: "3 Starters, 5 Main Course, Dal Makhani, Assorted Breads, 2 Warm Desserts",
    exclusionsText: "Outstation transport beyond 35 km",
  });

  const [addons, setAddons] = useState([
    {
      id: "chaat",
      title: "Live Delhi Chaat & Street Food Counter",
      desc: "Pani Puri, Dahi Bhalla, Sev Puri & Aloo Tikki with 2 Dedicated Chefs",
      price: 15000,
      priceUnit: "FLAT",
      selected: false,
    },
    {
      id: "mocktail",
      title: "Artisanal Mocktail & Smoked Drink Bar",
      desc: "Smoked Rosemary Mojito, Kiwi Crush, Fresh Fruit Juices & Flair Bartender",
      price: 20000,
      priceUnit: "FLAT",
      selected: false,
    },
    {
      id: "generator",
      title: "Silent 62.5 kVA Generator & Kitchen Power Backup",
      desc: "Includes 8 hours diesel backup and operator",
      price: 12000,
      priceUnit: "PER_DAY",
      selected: false,
    },
  ]);

  const [discountForm, setDiscountForm] = useState({
    name: "Festive Wedding Season Offer",
    discountType: "PERCENTAGE",
    discountPercent: 10,
    promoCode: "ROYAL10",
  });

  const [savedPackages, setSavedPackages] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [notification, setNotification] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [pkgs, discRes] = await Promise.all([
          fetchVendorPackages(vendorId),
          fetchVendorDiscounts(vendorId).catch(() => ({ items: [] })),
        ]);
        if (pkgs && Array.isArray(pkgs)) setSavedPackages(pkgs);
        if (discRes?.items) setDiscounts(discRes.items);
      } catch (e) {
        // Fallback silently if backend offline
      }
    }
    loadData();
  }, [vendorId]);

  const toggleAddon = (id) => {
    setAddons((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Integer paise calculation on frontend to mirror backend BIGINT math
  const basePaise = Math.round(Number(form.priceInr || 0) * 100);
  const addonsPaise = addons.reduce(
    (sum, item) => sum + (item.selected ? Math.round(item.price * 100) : 0),
    0
  );
  const subtotalPaise = basePaise + addonsPaise;
  const gstPaise = form.taxInclusive
    ? 0
    : Math.round((subtotalPaise * Number(form.gstRatePercent || 0)) / 100);
  const depositPaise = Math.round(Number(form.securityDepositInr || 0) * 100);
  const totalPayablePaise = subtotalPaise + gstPaise + depositPaise;

  const savePackage = async () => {
    setIsSubmitting(true);
    setErrorMsg("");

    if (depositPaise > 5000000) {
      setErrorMsg("Security deposit cannot exceed CONFIG cap of ₹50,000 (5,000,000 paise).");
      setIsSubmitting(false);
      return;
    }

    const selectedAddons = addons.filter((a) => a.selected);
    const payload = {
      name: form.name,
      tier: form.tier,
      description: form.inclusionsText,
      basePricePaise: basePaise,
      price: basePaise / 100,
      priceUnit: form.priceUnit,
      minGuests: Number(form.minGuests || 1),
      maxGuests: Number(form.maxGuests || 500),
      durationHours: Number(form.durationHours || 8),
      overtimeRatePaise: Math.round(Number(form.overtimeRateInr || 0) * 100),
      totalCapacityUnits: Number(form.totalCapacityUnits || 1),
      securityDepositPaise: depositPaise,
      gstRateBps: Math.round(Number(form.gstRatePercent || 18) * 100),
      hsnSacCode: form.hsnSacCode,
      taxInclusive: Boolean(form.taxInclusive),
      inclusions: form.inclusionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      exclusions: form.exclusionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      serviceIds: ["svc_royal_buffet"],
    };

    try {
      const created = await createVendorPackage(vendorId, payload);
      for (const addon of selectedAddons) {
        await addPackageAddon(vendorId, created.id, {
          name: addon.title,
          description: addon.desc,
          pricePaise: Math.round(addon.price * 100),
          priceUnit: addon.priceUnit,
        }).catch(() => null);
      }
      setSavedPackages((prev) => [created, ...prev]);
      setNotification(
        `✓ Package "${created.name}" (${created.tier}) saved in integer paise (${created.basePricePaise} paise)!`
      );
    } catch (e) {
      setErrorMsg(e.message || "Could not save package");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setNotification(""), 4500);
    }
  };

  const handlePublish = async (pkgId) => {
    setErrorMsg("");
    try {
      const published = await publishVendorPackage(vendorId, pkgId);
      setSavedPackages((prev) => prev.map((p) => (p.id === pkgId ? published : p)));
      setNotification(`✓ Package "${published.name}" passed media check (≥3 photos & ≥1 video) and is now PUBLISHED!`);
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  const handleCreateDiscount = async () => {
    setErrorMsg("");
    try {
      const created = await createVendorDiscount(vendorId, {
        name: discountForm.name,
        discountType: discountForm.discountType,
        discountValue:
          discountForm.discountType === "PERCENTAGE"
            ? Math.round(Number(discountForm.discountPercent) * 100)
            : Math.round(Number(discountForm.discountPercent) * 100),
        promoCode: discountForm.promoCode,
      });
      setDiscounts((prev) => [created, ...prev]);
      setNotification(`✓ Discount "${created.name}" (${created.promoCode || "Auto-Applied"}) activated!`);
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  return (
    <div className="vendor-section-card">
      <div className="vendor-section-header">
        <div>
          <h3>🍱 SRS Tiered Packages, Add-ons, GST & Discounts (FR-VEN-03..05, FR-VEN-09, FR-VEN-11)</h3>
          <p>
            Configure Basic / Standard / Premium tiers, integer paise pricing, GST HSN/SAC codes, refundable security deposit, and seasonal discounts.
          </p>
        </div>
        <div className="price-badge-box">
          <span className="price-label">Total Estimate (incl. GST & Deposit)</span>
          <span className="price-amount">₹{(totalPayablePaise / 100).toLocaleString("en-IN")}</span>
          <span className="text-xs text-slate-400 block">
            {totalPayablePaise.toLocaleString("en-IN")} paise (exact BIGINT)
          </span>
        </div>
      </div>

      {notification && <div className="notification-toast">✓ {notification}</div>}
      {errorMsg && (
        <div className="notification-toast" style={{ background: "#7f1d1d", color: "#fecaca" }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Package Configuration Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-lg bg-slate-900/60 border border-slate-700">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Package Name</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Tier (FR-VEN-03)</label>
          <select
            className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
          >
            <option value="Basic">Basic Tier</option>
            <option value="Standard">Standard Tier</option>
            <option value="Premium">Premium Tier</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Pricing Unit</label>
          <select
            className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
            value={form.priceUnit}
            onChange={(e) => setForm({ ...form, priceUnit: e.target.value })}
          >
            <option value="PER_DAY">Per Day</option>
            <option value="PER_HOUR">Per Hour</option>
            <option value="PER_PLATE">Per Plate</option>
            <option value="FLAT">Flat Rate</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Base Price (₹ INR)</label>
          <input
            type="number"
            className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
            value={form.priceInr}
            onChange={(e) => setForm({ ...form, priceInr: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">
            Refundable Security Deposit (₹, max ₹50,000)
          </label>
          <input
            type="number"
            className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
            value={form.securityDepositInr}
            onChange={(e) => setForm({ ...form, securityDepositInr: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Daily Capacity / Units (FR-VEN-06)</label>
          <input
            type="number"
            min="1"
            className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
            value={form.totalCapacityUnits}
            onChange={(e) => setForm({ ...form, totalCapacityUnits: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">GST Rate (%) & HSN/SAC (FR-VEN-11)</label>
          <div className="flex gap-2">
            <select
              className="w-1/2 p-2 rounded bg-slate-800 text-white border border-slate-700"
              value={form.gstRatePercent}
              onChange={(e) => setForm({ ...form, gstRatePercent: Number(e.target.value) })}
            >
              <option value={5}>5% GST</option>
              <option value={12}>12% GST</option>
              <option value={18}>18% GST</option>
            </select>
            <input
              type="text"
              placeholder="HSN/SAC"
              className="w-1/2 p-2 rounded bg-slate-800 text-white border border-slate-700"
              value={form.hsnSacCode}
              onChange={(e) => setForm({ ...form, hsnSacCode: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Guest Range (Min – Max)</label>
          <div className="flex gap-2">
            <input
              type="number"
              className="w-1/2 p-2 rounded bg-slate-800 text-white border border-slate-700"
              value={form.minGuests}
              onChange={(e) => setForm({ ...form, minGuests: Number(e.target.value) })}
            />
            <input
              type="number"
              className="w-1/2 p-2 rounded bg-slate-800 text-white border border-slate-700"
              value={form.maxGuests}
              onChange={(e) => setForm({ ...form, maxGuests: Number(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Inclusions (comma-separated)</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
            value={form.inclusionsText}
            onChange={(e) => setForm({ ...form, inclusionsText: e.target.value })}
          />
        </div>
      </div>

      {/* Add-ons Grid */}
      <h4 className="text-sm font-semibold text-slate-300 mb-2">Optional Independent Add-ons (FR-VEN-04)</h4>
      <div className="packages-grid">
        {addons.map((addon) => (
          <div
            key={addon.id}
            className={`package-item ${addon.selected ? "selected" : ""}`}
            onClick={() => toggleAddon(addon.id)}
          >
            <input type="checkbox" checked={addon.selected} onChange={() => {}} />
            <div>
              <h4>{addon.title}</h4>
              <p>{addon.desc}</p>
              <span className="item-price">
                + ₹{addon.price.toLocaleString("en-IN")} ({addon.priceUnit})
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Discount Creator (FR-VEN-05) */}
      <div className="mt-6 p-4 rounded-lg bg-slate-900/50 border border-slate-700">
        <h4 className="text-sm font-semibold text-slate-200 mb-2">🏷️ Promotional & Seasonal Discounts (FR-VEN-05)</h4>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-slate-400 block">Offer Name</label>
            <input
              type="text"
              className="p-2 rounded bg-slate-800 text-white border border-slate-700"
              value={discountForm.name}
              onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block">Discount %</label>
            <input
              type="number"
              className="p-2 w-24 rounded bg-slate-800 text-white border border-slate-700"
              value={discountForm.discountPercent}
              onChange={(e) => setDiscountForm({ ...discountForm, discountPercent: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block">Promo Code</label>
            <input
              type="text"
              className="p-2 w-32 rounded bg-slate-800 text-white border border-slate-700"
              value={discountForm.promoCode}
              onChange={(e) => setDiscountForm({ ...discountForm, promoCode: e.target.value })}
            />
          </div>
          <button type="button" className="secondary-button" onClick={handleCreateDiscount}>
            + Activate Discount
          </button>
        </div>
        {discounts.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3">
            {discounts.map((d) => (
              <span key={d.id} className="vendor-tag-pill bg-emerald-900 text-emerald-200">
                🏷️ {d.name} ({d.discountType === "PERCENTAGE" ? `${d.discountPercent}% OFF` : `₹${d.discountValue / 100} OFF`})
                {d.promoCode ? ` • Code: ${d.promoCode}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Saved Packages List with Publish Media Check */}
      {savedPackages.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <span className="text-xs text-slate-400 font-bold block mb-2">
            Vendor Packages in Database ({savedPackages.length}):
          </span>
          <div className="space-y-2">
            {savedPackages.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded bg-slate-800/80 border border-slate-700"
              >
                <div>
                  <strong className="text-white">{p.name}</strong>{" "}
                  <span className="vendor-tag-pill">{p.tier || "Standard"}</span>{" "}
                  <span className="vendor-tag-pill">
                    ₹{parseFloat(p.price).toLocaleString("en-IN")} ({p.priceUnit || "PER_DAY"})
                  </span>{" "}
                  <span className="text-xs text-slate-400">
                    • Capacity: {p.totalCapacityUnits || 1} units/day • GST: {(p.gstRateBps || 1800) / 100}% • Status:{" "}
                    <strong>{p.status || "PUBLISHED"}</strong>
                  </span>
                </div>
                {p.status !== "PUBLISHED" && (
                  <button
                    type="button"
                    className="secondary-button text-xs"
                    onClick={() => handlePublish(p.id)}
                  >
                    🚀 Publish (Requires ≥3 Photos + 1 Video)
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="actions-row-end mt-4">
        <button
          type="button"
          onClick={savePackage}
          disabled={isSubmitting}
          className="primary-button"
        >
          {isSubmitting ? "Saving..." : "💾 Save Tiered Package"}
        </button>
      </div>
    </div>
  );
}
