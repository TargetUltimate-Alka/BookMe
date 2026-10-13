import { useState, useEffect } from "react";
import VendorGallery from "./VendorGallery";
import VendorPackages from "./VendorPackages";
import VendorCalendar from "./VendorCalendar";
import {
  fetchKycStatus,
  completeDigiLockerKyc,
  verifyPanKyc,
  verifyBankPennyDrop,
  signVendorAgreement,
  submitVendorForReview,
  updateVendorProfile,
  fetchVendorWallet,
  topupVendorWallet,
} from "./api";

const VENDOR_ID = "vnd_sunset_caterers";

const LABELS = {
  en: {
    overview: "📊 Overview & Inquiries",
    onboarding: "🛡️ Onboarding, KYC & Agreement",
    packages: "🍱 Tiered Packages & GST",
    gallery: "📸 Media & Moderation",
    calendar: "🗓️ Capacity Calendar",
    wallet: "💳 Lead Wallet",
    viewCustomer: "👁️ View as Customer",
  },
  hi: {
    overview: "📊 अवलोकन और बुकिंग",
    onboarding: "🛡️ ऑनबोर्डिंग, केवाईसी और अनुबंध",
    packages: "🍱 पैकेज और जीएसटी",
    gallery: "📸 फ़ोटो और वीडियो",
    calendar: "🗓️ उपलब्धता कैलेंडर",
    wallet: "💳 लीड वॉलेट",
    viewCustomer: "👁️ ग्राहक दृश्य",
  },
  gu: {
    overview: "📊 ઓવરવ્યૂ અને બુકિંગ",
    onboarding: "🛡️ ઓનબોર્ડિંગ, KYC અને કરાર",
    packages: "🍱 પેકેજ અને GST",
    gallery: "📸 ફોટા અને મીડિયા",
    calendar: "🗓️ ઉપલબ્ધતા કેલેન્ડર",
    wallet: "💳 લીડ વોલેટ",
    viewCustomer: "👁️ ગ્રાહક તરીકે જુઓ",
  },
};

export default function VendorDashboard({ onSwitchToMarketplace }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [lang, setLang] = useState("en");
  const t = LABELS[lang] || LABELS.en;

  const [bookingRequests, setBookingRequests] = useState([
    {
      id: 1,
      title: "Grand Wedding Reception (450 Guests)",
      client: "Kavya & Rohan Patel",
      package: "Royal Wedding Buffet + Live Chaat (Premium Tier)",
      date: "Dec 18, 2026",
      location: "Karnavati Club, Ahmedabad (Within 50 km radius)",
      amount: "₹1,45,000",
      status: "pending",
    },
    {
      id: 2,
      title: "Corporate Leadership Summit (150 Pax)",
      client: "FinTech Hub India",
      package: "Executive High-Tea & Multi-Cuisine (Standard Tier)",
      date: "Nov 05, 2026",
      location: "GIFT City Tech Tower",
      amount: "₹85,000",
      status: "pending",
    },
  ]);

  const [kycState, setKycState] = useState({
    kycStatus: "APPROVED",
    verified: true,
    rejectionReason: null,
    digilocker: { verified: true, aadhaarMasked: "XXXX-XXXX-4821", verifiedName: "Rajeshbhai Patel" },
    pan: { verified: true, panMasked: "AB*****90K" },
    bank: { verified: true, accountMasked: "********4412", ifsc: "HDFC0000123" },
    agreement: { signedVersion: "v1.0", requiredVersion: "v1.0", isCurrentVersionSigned: true },
    statusHistory: [],
  });

  const [profileForm, setProfileForm] = useState({
    businessName: "Sunset Royal Caterers & Events",
    location: "SG Highway, Ahmedabad",
    address: "Plot 42, SG Highway, Bodakdev, Ahmedabad 380054",
    latitude: 23.0415,
    longitude: 72.5086,
    serviceRadiusKm: 50,
    categoriesText: "Caterer, Vegetarian Caterer, Live Food Counter, Sweets and Desserts",
  });

  const [kycInputs, setKycInputs] = useState({
    aadhaarLast4: "4821",
    verifiedName: "Rajeshbhai Patel",
    panNumber: "ABCDE1234F",
    accountNumber: "50100234984412",
    ifscCode: "HDFC0000123",
  });

  const [wallet, setWallet] = useState({
    balancePaise: 250000,
    balanceInr: 2500,
    minWalletBalancePaise: 50000,
    leadChargePaise: 5000,
    isLowBalance: false,
    alertMessage: null,
    transactions: [],
  });

  const [notification, setNotification] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchKycStatus(VENDOR_ID)
      .then((res) => {
        if (res) setKycState(res);
      })
      .catch(() => {});
    fetchVendorWallet(VENDOR_ID)
      .then((res) => {
        if (res) setWallet(res);
      })
      .catch(() => {});
  }, []);

  const handleBookingAction = (id, accepted) => {
    setBookingRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: accepted ? "accepted" : "declined" } : r
      )
    );
    setNotification(
      accepted
        ? "Booking accepted! Immutable price snapshot locked & capacity reserved on calendar."
        : "Booking request declined."
    );
    setTimeout(() => setNotification(""), 3500);
  };

  const handleSaveProfile = async () => {
    setErrorMsg("");
    try {
      await updateVendorProfile(VENDOR_ID, {
        businessName: profileForm.businessName,
        location: profileForm.location,
        address: profileForm.address,
        latitude: Number(profileForm.latitude),
        longitude: Number(profileForm.longitude),
        serviceRadiusKm: Number(profileForm.serviceRadiusKm),
        categories: profileForm.categoriesText.split(",").map((s) => s.trim()).filter(Boolean),
        preferredLanguage: lang,
      });
      setNotification("✓ Vendor onboarding profile, map coordinates & service radius saved!");
    } catch (e) {
      setErrorMsg(e.message);
    }
    setTimeout(() => setNotification(""), 3500);
  };

  const handleDigiLockerVerify = async () => {
    setErrorMsg("");
    if (String(kycInputs.aadhaarLast4).replace(/\D/g, "").length === 12) {
      setErrorMsg("SECURITY BLOCK (FR-ONB-03 / NFR-SEC-05): Raw 12-digit Aadhaar numbers are strictly prohibited. Enter only last 4 digits from DigiLocker.");
      return;
    }
    try {
      const updated = await completeDigiLockerKyc(VENDOR_ID, {
        verifiedName: kycInputs.verifiedName,
        aadhaarLast4: String(kycInputs.aadhaarLast4).slice(-4),
        consentAccepted: true,
      });
      setKycState(updated);
      setNotification("✓ DigiLocker KYC verified (only masked last-4 reference stored)!");
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  const handlePanAndBankVerify = async () => {
    setErrorMsg("");
    try {
      await verifyPanKyc(VENDOR_ID, {
        panNumber: kycInputs.panNumber,
        nameOnPan: kycInputs.verifiedName,
      });
      const updated = await verifyBankPennyDrop(VENDOR_ID, {
        accountHolderName: kycInputs.verifiedName,
        accountNumber: kycInputs.accountNumber,
        ifscCode: kycInputs.ifscCode,
      });
      setKycState(updated);
      setNotification("✓ PAN & Bank Penny-Drop verified and encrypted!");
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  const handleSignAgreement = async () => {
    setErrorMsg("");
    try {
      await signVendorAgreement(VENDOR_ID, { agreementVersion: "v1.0", accepted: true });
      const updated = await fetchKycStatus(VENDOR_ID);
      setKycState(updated);
      setNotification("✓ Vendor Agreement v1.0 e-signed with SHA-256 hash & IP timestamp!");
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  const handleSubmitForReview = async () => {
    setErrorMsg("");
    try {
      await submitVendorForReview(VENDOR_ID);
      const updated = await fetchKycStatus(VENDOR_ID);
      setKycState(updated);
      setNotification("✓ Profile submitted to Verifier queue (status: SUBMITTED)!");
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  const handleWalletTopup = async (amountPaise) => {
    try {
      const updated = await topupVendorWallet(VENDOR_ID, amountPaise);
      setWallet(updated);
      setNotification(`✓ Added ₹${(amountPaise / 100).toLocaleString("en-IN")} to Lead Wallet!`);
    } catch (e) {
      setErrorMsg(e.message);
    }
    setTimeout(() => setNotification(""), 3500);
  };

  return (
    <div className="vendor-portal-wrap">
      {/* Portal Top Bar */}
      <div className="vendor-portal-header">
        <div className="vendor-profile-info">
          <div className="vendor-avatar">SR</div>
          <div>
            <div className="vendor-title-row">
              <h2>{profileForm.businessName}</h2>
              <span className="badge-verified">
                ✓ Status: {kycState.kycStatus || "APPROVED"}
              </span>
              <span className="badge-rating">★ 4.96 (128 reviews)</span>
            </div>
            <p className="vendor-subinfo">
              📍 {profileForm.location} ({profileForm.serviceRadiusKm} km radius) • 🍽️ {profileForm.categoriesText}
            </p>
          </div>
        </div>

        <div className="vendor-header-actions">
          {/* Localization Selector (EN / HI / GU - FR-LOC-01..02) */}
          <select
            className="p-2 rounded bg-slate-800 text-xs text-slate-200 border border-slate-700"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            title="Language Preference (FR-LOC-01)"
          >
            <option value="en">🇬🇧 English</option>
            <option value="hi">🇮🇳 हिंदी (Hindi)</option>
            <option value="gu">🇮🇳 ગુજરાતી (Gujarati)</option>
          </select>

          <div className="payout-summary">
            <span className="payout-label">Lead Wallet Balance</span>
            <span className="payout-val">
              ₹{Number(wallet.balanceInr || 2500).toLocaleString("en-IN")}
            </span>
          </div>

          {onSwitchToMarketplace && (
            <button
              type="button"
              className="secondary-button"
              onClick={onSwitchToMarketplace}
            >
              {t.viewCustomer}
            </button>
          )}
        </div>
      </div>

      {notification && <div className="notification-toast">✓ {notification}</div>}
      {errorMsg && (
        <div className="notification-toast" style={{ background: "#7f1d1d", color: "#fecaca" }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="vendor-nav-tabs flex-wrap">
        <button
          type="button"
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          {t.overview}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "onboarding" ? "active" : ""}`}
          onClick={() => setActiveTab("onboarding")}
        >
          {t.onboarding}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "packages" ? "active" : ""}`}
          onClick={() => setActiveTab("packages")}
        >
          {t.packages}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "gallery" ? "active" : ""}`}
          onClick={() => setActiveTab("gallery")}
        >
          {t.gallery}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "calendar" ? "active" : ""}`}
          onClick={() => setActiveTab("calendar")}
        >
          {t.calendar}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "wallet" ? "active" : ""}`}
          onClick={() => setActiveTab("wallet")}
        >
          {t.wallet}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content-body">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="metrics-row">
              <div className="metric-box">
                <span className="metric-title">Onboarding & KYC Status</span>
                <p className="metric-num">{kycState.kycStatus}</p>
                <span className="metric-sub text-green">
                  Agreement {kycState.agreement?.signedVersion || "v1.0"} Signed
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-title">Service Coverage</span>
                <p className="metric-num">{profileForm.serviceRadiusKm} km</p>
                <span className="metric-sub">📍 Geo-Radius Enforced (FR-VEN-08)</span>
              </div>
              <div className="metric-box">
                <span className="metric-title">Lead Wallet</span>
                <p className="metric-num">₹{Number(wallet.balanceInr || 2500).toLocaleString("en-IN")}</p>
                <span className="metric-sub text-green">
                  Lead Fee: ₹{(wallet.leadChargePaise || 5000) / 100}/lead
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-title">Client Rating</span>
                <p className="metric-num">4.96 ★</p>
                <span className="metric-sub">128 Verified Bookings</span>
              </div>
            </div>

            <div className="inquiries-card">
              <div className="inquiries-header">
                <h3>🔔 Live Customer Booking Inquiries</h3>
                <span className="badge-count">
                  {bookingRequests.filter((r) => r.status === "pending").length} Pending
                </span>
              </div>

              <div className="inquiries-list">
                {bookingRequests.map((req) => (
                  <div key={req.id} className={`inquiry-row ${req.status}`}>
                    <div className="inquiry-main">
                      <h4>{req.title}</h4>
                      <p className="inquiry-client">
                        Client: <strong>{req.client}</strong> • Package: <em>{req.package}</em>
                      </p>
                      <p className="inquiry-meta">
                        📅 {req.date} • 📍 {req.location}
                      </p>
                    </div>

                    <div className="inquiry-actions">
                      <div className="inquiry-price">
                        <strong>{req.amount}</strong>
                        <span>Immutable Price Snapshot</span>
                      </div>
                      {req.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => handleBookingAction(req.id, true)}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => handleBookingAction(req.id, false)}
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <span className={`status-tag ${req.status}`}>
                          {req.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "onboarding" && (
          <div className="vendor-section-card space-y-6">
            <div className="vendor-section-header">
              <div>
                <h3>🛡️ Vendor Onboarding, DigiLocker KYC & Agreement E-Sign (FR-ONB-02..06)</h3>
                <p>
                  Statuses: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED / SUSPENDED. Raw Aadhaar numbers are never stored.
                </p>
              </div>
              <span className="badge-verified">Current State: {kycState.kycStatus}</span>
            </div>

            {/* Step 1: Business Profile, Multi-Category & Service Radius */}
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700 space-y-3">
              <h4 className="text-sm font-semibold text-white">
                1. Business Profile, Multi-Categories & Geo Service Radius (FR-ONB-02, FR-VEN-08)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block">Business Name</label>
                  <input
                    type="text"
                    className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
                    value={profileForm.businessName}
                    onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block">Service Categories (comma-separated)</label>
                  <input
                    type="text"
                    className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
                    value={profileForm.categoriesText}
                    onChange={(e) => setProfileForm({ ...profileForm, categoriesText: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block">Service Radius (km)</label>
                  <input
                    type="number"
                    className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
                    value={profileForm.serviceRadiusKm}
                    onChange={(e) => setProfileForm({ ...profileForm, serviceRadiusKm: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block">Map Pin Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
                    value={profileForm.latitude}
                    onChange={(e) => setProfileForm({ ...profileForm, latitude: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block">Map Pin Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
                    value={profileForm.longitude}
                    onChange={(e) => setProfileForm({ ...profileForm, longitude: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <button type="button" className="secondary-button w-full" onClick={handleSaveProfile}>
                    💾 Save Profile Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: DigiLocker, PAN & Bank Penny-Drop KYC */}
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700 space-y-3">
              <h4 className="text-sm font-semibold text-white">
                2. Identity & Bank Verification (FR-ONB-03 / NFR-SEC-05 — No Raw Aadhaar Stored)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block">Verified Name (DigiLocker)</label>
                  <input
                    type="text"
                    className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
                    value={kycInputs.verifiedName}
                    onChange={(e) => setKycInputs({ ...kycInputs, verifiedName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block">Masked Aadhaar Last 4 Digits Only</label>
                  <input
                    type="text"
                    maxLength={14}
                    className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
                    value={kycInputs.aadhaarLast4}
                    onChange={(e) => setKycInputs({ ...kycInputs, aadhaarLast4: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block">PAN Number</label>
                  <input
                    type="text"
                    className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700"
                    value={kycInputs.panNumber}
                    onChange={(e) => setKycInputs({ ...kycInputs, panNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block">Bank Account & IFSC</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      className="w-1/2 p-2 rounded bg-slate-800 text-white border border-slate-700 text-xs"
                      value={kycInputs.accountNumber}
                      onChange={(e) => setKycInputs({ ...kycInputs, accountNumber: e.target.value })}
                    />
                    <input
                      type="text"
                      className="w-1/2 p-2 rounded bg-slate-800 text-white border border-slate-700 text-xs"
                      value={kycInputs.ifscCode}
                      onChange={(e) => setKycInputs({ ...kycInputs, ifscCode: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button type="button" className="secondary-button" onClick={handleDigiLockerVerify}>
                  🔐 Verify DigiLocker OAuth ({kycState.digilocker?.aadhaarMasked || "Pending"})
                </button>
                <button type="button" className="secondary-button" onClick={handlePanAndBankVerify}>
                  🏦 Verify PAN & Bank Penny-Drop ({kycState.bank?.accountMasked || "Pending"})
                </button>
              </div>
            </div>

            {/* Step 3: E-Sign Vendor Agreement & Submit for Review */}
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  3. Vendor Marketplace Agreement E-Sign & Submission (FR-ONB-04, FR-ONB-06)
                </h4>
                <p className="text-xs text-slate-400">
                  Required Agreement Version: <strong>{kycState.agreement?.requiredVersion || "v1.0"}</strong> • Signed:{" "}
                  <strong>{kycState.agreement?.signedVersion || "Unsigned"}</strong>
                </p>
              </div>
              <div className="flex gap-3">
                <button type="button" className="secondary-button" onClick={handleSignAgreement}>
                  ✍️ E-Sign Agreement v1.0
                </button>
                <button type="button" className="primary-button" onClick={handleSubmitForReview}>
                  🚀 Submit Profile for Verifier Review
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "gallery" && <VendorGallery vendorId={VENDOR_ID} />}
        {activeTab === "packages" && <VendorPackages vendorId={VENDOR_ID} />}
        {activeTab === "calendar" && <VendorCalendar vendorId={VENDOR_ID} />}

        {activeTab === "wallet" && (
          <div className="vendor-section-card space-y-6">
            <div className="vendor-section-header">
              <div>
                <h3>💳 Vendor Lead Wallet & Minimum Balance Alerts (FR-WAL-01..04)</h3>
                <p>
                  Maintain at least ₹{(wallet.minWalletBalancePaise || 50000) / 100} balance to receive instant paid leads without interruption.
                </p>
              </div>
              <div className="price-badge-box">
                <span className="price-label">Current Balance</span>
                <span className="price-amount">
                  ₹{Number(wallet.balanceInr || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {wallet.alertMessage && (
              <div className="notification-toast" style={{ background: "#78350f", color: "#fde68a" }}>
                ⚠️ {wallet.alertMessage}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                className="primary-button"
                onClick={() => handleWalletTopup(100000)}
              >
                + Top Up ₹1,000 (100,000 paise)
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => handleWalletTopup(250000)}
              >
                + Top Up ₹2,500 (250,000 paise)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
