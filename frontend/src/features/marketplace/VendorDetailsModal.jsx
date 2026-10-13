import { useState } from "react";

export function VendorDetailsModal({
  isOpen,
  onClose,
  vendor,
  onBookNow,
  isWishlisted,
  onToggleWishlist,
}) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  if (!isOpen || !vendor) return null;

  const photos = [
    vendor.coverImage || vendor.photoUrl || "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80",
  ];

  const packages = [
    {
      id: "pkg_basic",
      name: "Standard Experience Package",
      tier: "Standard",
      price: vendor.basePrice || 45000,
      description: "Essential full-service coverage tailored for medium-scale celebrations.",
      inclusions: [
        "Dedicated lead event team & on-site supervisor",
        "Full equipment setup and sound/decor check 3 hours prior",
        "Live coordination & backup personnel",
        "All required standard consumables & instruments",
      ],
    },
    {
      id: "pkg_premium",
      name: "Royal Celebration VIP Package",
      tier: "Premium",
      price: Math.round((vendor.basePrice || 45000) * 1.5),
      description: "Comprehensive luxury setup with extended duration and premium additions.",
      inclusions: [
        "Senior master specialists with 10+ years experience",
        "Extended 8-hour uninterrupted event coverage",
        "High-definition 4K aerial drone or live projection integration",
        "Complimentary VIP welcome counters & priority response",
        "Dedicated backup generator & dual redundancy",
      ],
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-detail-title"
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          maxWidth: "760px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
            position: "sticky",
            top: 0,
            background: "#ffffff",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                background: "#e0e7ff",
                color: "#3730a3",
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
                textTransform: "uppercase",
              }}
            >
              {vendor.category || "Service"}
            </span>
            <h2
              id="vendor-detail-title"
              style={{ margin: 0, fontSize: "1.2rem", fontWeight: 750, color: "#0f172a" }}
            >
              {vendor.businessName}
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => onToggleWishlist(vendor)}
              style={{
                background: isWishlisted ? "#fef2f2" : "#f8fafc",
                border: "1px solid",
                borderColor: isWishlisted ? "#fecaca" : "#e2e8f0",
                color: isWishlisted ? "#ef4444" : "#64748b",
                borderRadius: "10px",
                padding: "6px 12px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{isWishlisted ? "❤️ Saved" : "🤍 Save"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                fontSize: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
              }}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Main Photo Gallery */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                width: "100%",
                height: 320,
                borderRadius: 14,
                overflow: "hidden",
                background: "#0f172a",
                position: "relative",
                marginBottom: 10,
              }}
            >
              <img
                src={photos[selectedPhotoIndex]}
                alt={vendor.businessName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 12,
                  background: "rgba(0, 0, 0, 0.7)",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                Photo {selectedPhotoIndex + 1} of {photos.length}
              </div>
            </div>

            {/* Thumbnail Row */}
            <div style={{ display: "flex", gap: 10 }}>
              {photos.map((ph, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  style={{
                    width: 70,
                    height: 52,
                    borderRadius: 8,
                    overflow: "hidden",
                    cursor: "pointer",
                    border: selectedPhotoIndex === idx ? "2.5px solid #4f46e5" : "1.5px solid #e2e8f0",
                    opacity: selectedPhotoIndex === idx ? 1 : 0.6,
                    transition: "all 0.2s ease",
                  }}
                >
                  <img
                    src={ph}
                    alt="thumbnail"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Info Badges */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              marginBottom: 16,
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
            }}
          >
            {vendor.rating && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 750, color: "#047857" }}>
                <span>★</span>
                <span>{vendor.rating}</span>
                <span style={{ color: "#64748b", fontWeight: 500 }}>
                  ({vendor.reviewsCount || 0} reviews)
                </span>
              </div>
            )}
            <div style={{ color: "#475569", fontSize: "0.85rem" }}>
              📍 <strong>{vendor.location || "Pan-India"}</strong>
              {vendor.serviceRadiusKm ? ` (${vendor.serviceRadiusKm} km coverage)` : ""}
            </div>
            {vendor.verified && (
              <div style={{ color: "#059669", fontSize: "0.8rem", fontWeight: 700 }}>
                ✓ DigiLocker & KYC Verified
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ margin: "0 0 6px 0", fontSize: "1rem", color: "#0f172a" }}>About Business</h4>
            <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.6, color: "#475569" }}>
              {vendor.description ||
                "Dedicated event service professional providing high-standard event management, sound, catering, or styling tailored to weddings, receptions, and birthday galas."}
            </p>
          </div>

          {/* Available Packages */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#0f172a" }}>
              Service Packages & Tiers
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  style={{
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 14,
                    padding: "16px 20px",
                    background: pkg.tier === "Premium" ? "#fbfbfe" : "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h5 style={{ margin: 0, fontSize: "1rem", fontWeight: 750, color: "#0f172a" }}>
                          {pkg.name}
                        </h5>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: pkg.tier === "Premium" ? "#fef3c7" : "#e0e7ff",
                            color: pkg.tier === "Premium" ? "#b45309" : "#3730a3",
                          }}
                        >
                          {pkg.tier}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
                        {pkg.description}
                      </p>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <strong style={{ fontSize: "1.2rem", color: "#0f172a" }}>
                        ₹{Number(pkg.price).toLocaleString("en-IN")}
                      </strong>
                      <span style={{ display: "block", fontSize: "0.6875rem", color: "#64748b" }}>
                        40% deposit (₹{Math.round(pkg.price * 0.4).toLocaleString("en-IN")})
                      </span>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: 10 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                      Package Inclusions:
                    </span>
                    <ul style={{ margin: "6px 0 0 0", paddingLeft: 18, fontSize: "0.8125rem", color: "#334155" }}>
                      {pkg.inclusions.map((inc, i) => (
                        <li key={i} style={{ marginBottom: 3 }}>
                          {inc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onBookNow(vendor, pkg);
                      }}
                      className="marketplace-header-btn primary"
                      style={{ padding: "8px 18px", fontSize: "0.875rem" }}
                    >
                      Book {pkg.tier} ⚡
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BookMe Escrow & Cancellation Guarantee */}
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>🛡️</span>
            <div>
              <strong style={{ fontSize: "0.875rem", color: "#166534", display: "block" }}>
                BookMe Escrow & Cancellation Policy
              </strong>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#15803d", lineHeight: 1.4 }}>
                40% deposit is held securely in escrow until service delivery. Free cancellation within 12 hours of confirmation if event is more than 7 days away. Zero off-platform hidden fees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
