export default function VendorCard({ vendor, onBookNow, onNotifyMe }) {
  const firstPkg = vendor.matchingPackages?.[0];
  const originalInr = firstPkg?.originalPricePaise
    ? firstPkg.originalPricePaise / 100
    : vendor.basePrice;
  const effectiveInr =
    vendor.startingPriceInr ??
    (firstPkg?.effectivePricePaise ? firstPkg.effectivePricePaise / 100 : vendor.basePrice);
  const hasDiscount =
    Boolean(vendor.hasActiveDiscount) ||
    (originalInr && effectiveInr && originalInr > effectiveInr);

  return (
    <article className="vendor-card">
      <div className="vendor-card-cover">
        <img
          src={
            vendor.coverImage ||
            vendor.photoUrl ||
            "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80"
          }
          alt={vendor.businessName}
        />
        <div className="vendor-card-badges">
          {vendor.rating && <span className="badge-rating">★ {vendor.rating}</span>}
          {vendor.isDemo ? (
            <span
              className="badge-rating"
              style={{ background: "#78350f", color: "#fde68a" }}
            >
              🧪 Demo Sample (Unverified)
            </span>
          ) : (
            vendor.verified && <span className="badge-verified">✓ KYC Verified</span>
          )}
          {hasDiscount && (
            <span
              className="badge-verified"
              style={{ background: "#065f46", color: "#a7f3d0" }}
            >
              🏷️ Offer Active
            </span>
          )}
        </div>
      </div>

      <div className="vendor-card-content">
        <div className="vendor-card-header">
          <h3>{vendor.businessName}</h3>
          <p className="vendor-location">
            📍 {vendor.location} • {vendor.category}
            {vendor.serviceRadiusKm ? ` • 🚗 ${vendor.serviceRadiusKm} km radius` : ""}
            {vendor.distanceKm !== null && vendor.distanceKm !== undefined
              ? ` (${vendor.distanceKm} km away)`
              : ""}
          </p>
        </div>

        <p className="vendor-desc">{vendor.description}</p>

        <div className="vendor-tags-row">
          {vendor.tags?.map((tag, idx) => (
            <span key={idx} className="vendor-tag-pill">
              {tag}
            </span>
          ))}
        </div>

        <div className="vendor-card-footer">
          <div>
            <span className="price-sub">Starting from (excl. GST)</span>
            <div className="flex items-center gap-2">
              {hasDiscount && originalInr > effectiveInr && (
                <span className="text-xs line-through text-slate-400">
                  ₹{Number(originalInr).toLocaleString("en-IN")}
                </span>
              )}
              <strong className="price-main">
                ₹{Number(effectiveInr || 45000).toLocaleString("en-IN")}
              </strong>
            </div>
          </div>

          <div className="flex gap-2">
            {onNotifyMe && (
              <button
                type="button"
                className="secondary-button text-xs"
                onClick={() => onNotifyMe(vendor)}
                title="Get alerted when a booked-out date opens up (FR-SRCH-05)"
              >
                🔔 Notify Me
              </button>
            )}
            <button
              type="button"
              className="primary-button"
              onClick={() => onBookNow && onBookNow(vendor)}
            >
              Book Vendor ⚡
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
