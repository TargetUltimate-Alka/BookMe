import { useState } from "react";

export function MarketplaceVendors({
  vendors = [],
  isLoading = false,
  onBookNow,
  onViewDetails,
  onToggleWishlist,
  wishlistIds = [],
  onNotifyMe,
  filterCategory = "all",
  searchQuery = "",
  totalMatches = 0,
}) {
  const [activeSectionTab, setActiveSectionTab] = useState("all");
  const [priceSort, setPriceSort] = useState("default");
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [minRatingFilter, setMinRatingFilter] = useState("0");

  // Filter vendors based on local section tab and user filters
  const filteredVendors = vendors.filter((v) => {
    if (onlyOffers && !v.hasActiveDiscount) return false;
    if (minRatingFilter !== "0" && (v.rating || 0) < parseFloat(minRatingFilter)) return false;

    if (activeSectionTab === "top_rated") {
      return (v.rating || 0) >= 4.9;
    }
    if (activeSectionTab === "wedding") {
      const cat = (v.category || "").toLowerCase();
      return (
        cat.includes("photo") ||
        cat.includes("cater") ||
        cat.includes("decor") ||
        cat.includes("mehndi")
      );
    }
    if (activeSectionTab === "birthday") {
      const cat = (v.category || "").toLowerCase();
      return cat.includes("dj") || cat.includes("decor") || cat.includes("cater");
    }
    if (activeSectionTab === "budget") {
      return (v.basePrice || 0) <= 50000;
    }
    return true;
  });

  // Apply sorting
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    if (priceSort === "price_asc") {
      return (a.basePrice || 0) - (b.basePrice || 0);
    }
    if (priceSort === "price_desc") {
      return (b.basePrice || 0) - (a.basePrice || 0);
    }
    if (priceSort === "rating_desc") {
      return (b.rating || 0) - (a.rating || 0);
    }
    return 0;
  });

  return (
    <section id="marketplace-vendors-section" className="marketplace-section" aria-labelledby="marketplace-vendors-title">
      {/* Section Header */}
      <div className="marketplace-section-header">
        <div className="marketplace-section-title-wrap">
          <h2 id="marketplace-vendors-title">
            {filterCategory !== "all"
              ? `${filterCategory} Specialists`
              : searchQuery
              ? `Search Results for "${searchQuery}"`
              : "Explore Verified Event Professionals"}
          </h2>
          <p>
            Showing {sortedVendors.length} of {totalMatches || vendors.length} verified vendors • 40% Escrow protected
          </p>
        </div>
      </div>

      {/* Filter and Curated Section Navigation Strip */}
      <div className="marketplace-controls-card">
        {/* Curated Section Pills */}
        <div className="marketplace-filters-group">
          <button
            type="button"
            className={`filter-pill-toggle ${activeSectionTab === "all" ? "active" : ""}`}
            onClick={() => setActiveSectionTab("all")}
          >
            🔥 All Vendors
          </button>
          <button
            type="button"
            className={`filter-pill-toggle ${activeSectionTab === "top_rated" ? "active" : ""}`}
            onClick={() => setActiveSectionTab("top_rated")}
          >
            ⭐ Top-Rated (4.9★+)
          </button>
          <button
            type="button"
            className={`filter-pill-toggle ${activeSectionTab === "wedding" ? "active" : ""}`}
            onClick={() => setActiveSectionTab("wedding")}
          >
            💍 Wedding Essentials
          </button>
          <button
            type="button"
            className={`filter-pill-toggle ${activeSectionTab === "birthday" ? "active" : ""}`}
            onClick={() => setActiveSectionTab("birthday")}
          >
            🎉 Birthday & Party
          </button>
          <button
            type="button"
            className={`filter-pill-toggle ${activeSectionTab === "budget" ? "active" : ""}`}
            onClick={() => setActiveSectionTab("budget")}
          >
            🏷️ Budget-Friendly (Under ₹50k)
          </button>
        </div>

        {/* Secondary Controls (Rating, Offers, Sort) */}
        <div className="marketplace-filters-group">
          <label
            className={`filter-pill-toggle ${onlyOffers ? "active" : ""}`}
            style={{ cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={onlyOffers}
              onChange={(e) => setOnlyOffers(e.target.checked)}
              style={{ display: "none" }}
            />
            <span>🏷️ Offers & Discounts Only</span>
          </label>

          <select
            className="filter-select"
            value={minRatingFilter}
            onChange={(e) => setMinRatingFilter(e.target.value)}
            aria-label="Filter by minimum rating"
          >
            <option value="0">Any Rating</option>
            <option value="4.5">★ 4.5 & Above</option>
            <option value="4.8">★ 4.8 & Above</option>
          </select>

          <select
            className="filter-select"
            value={priceSort}
            onChange={(e) => setPriceSort(e.target.value)}
            aria-label="Sort vendors by price or rating"
          >
            <option value="default">Sort: Recommended</option>
            <option value="rating_desc">Highest Rated</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="vendor-cards-grid">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="premium-vendor-card"
              style={{ minHeight: 380, opacity: 0.6 }}
            >
              <div
                style={{
                  height: 200,
                  background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
                }}
              />
              <div style={{ padding: 18 }}>
                <div style={{ height: 16, width: "60%", background: "#e2e8f0", marginBottom: 12, borderRadius: 4 }} />
                <div style={{ height: 22, width: "85%", background: "#e2e8f0", marginBottom: 10, borderRadius: 4 }} />
                <div style={{ height: 14, width: "40%", background: "#e2e8f0", marginBottom: 16, borderRadius: 4 }} />
                <div style={{ height: 38, width: "100%", background: "#f1f5f9", borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : sortedVendors.length === 0 ? (
        /* Empty State with "Notify Me" */
        <div
          style={{
            background: "#ffffff",
            border: "1.5px dashed #cbd5e1",
            borderRadius: 20,
            padding: "48px 24px",
            textAlign: "center",
            maxWidth: 600,
            margin: "24px auto",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🔍</div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 750, color: "#0f172a", margin: "0 0 8px 0" }}>
            No Matching Vendors Found
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.5, margin: "0 0 20px 0" }}>
            We couldn't find available professionals matching your current filters in this category. You can adjust your search or request a notification when new slots open!
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              className="marketplace-header-btn primary"
              onClick={() => {
                setActiveSectionTab("all");
                setOnlyOffers(false);
                setMinRatingFilter("0");
                setPriceSort("default");
              }}
            >
              Clear All Filters
            </button>
            {onNotifyMe && (
              <button
                type="button"
                className="marketplace-header-btn outline"
                onClick={() => onNotifyMe({ category: filterCategory !== "all" ? filterCategory : "Event Vendor" })}
              >
                🔔 Notify Me When Available
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Render Vendor Cards */
        <div className="vendor-cards-grid">
          {sortedVendors.map((vendor) => {
            const isWishlisted = wishlistIds.includes(vendor.id);
            const firstPkg = vendor.matchingPackages?.[0];
            const originalInr =
              vendor.originalPriceInr ??
              vendor.originalPrice ??
              (firstPkg?.originalPricePaise
                ? firstPkg.originalPricePaise / 100
                : (vendor.basePrice ? Math.round(vendor.basePrice * 1.15) : 45000));
            const effectiveInr =
              vendor.startingPriceInr ??
              vendor.basePrice ??
              (firstPkg?.effectivePricePaise ? firstPkg.effectivePricePaise / 100 : 35000);
            const hasDiscount =
              Boolean(vendor.hasActiveDiscount) ||
              (originalInr && effectiveInr && originalInr > effectiveInr);
            const distanceLabel = vendor.distanceText || (vendor.serviceRadiusKm ? `${vendor.serviceRadiusKm} km radius` : "3.2 km away");

            return (
              <article key={vendor.id} className="premium-vendor-card">
                {/* Media Section */}
                <div
                  className="vendor-card-media"
                  onClick={() => onViewDetails(vendor)}
                  style={{ cursor: "pointer" }}
                  title="Click to view full portfolio"
                >
                  <img
                    src={
                      vendor.coverImage ||
                      vendor.photoUrl ||
                      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80"
                    }
                    alt={vendor.businessName}
                    loading="lazy"
                  />

                  {/* Badges */}
                  <div className="vendor-card-top-badges">
                    {vendor.verified && (
                      <span className="card-badge verified">🛡️ Verified Pro</span>
                    )}
                    {hasDiscount && (
                      <span className="card-badge discount">
                        {vendor.discountBadge || "🏷️ 15% Off"}
                      </span>
                    )}
                    {vendor.isDemo && (
                      <span className="card-badge demo">🧪 Demo Sample</span>
                    )}
                  </div>

                  {/* Wishlist Button */}
                  <button
                    type="button"
                    className={`vendor-card-wishlist-btn ${isWishlisted ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(vendor);
                    }}
                    title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
                    aria-label="Wishlist"
                  >
                    {isWishlisted ? "❤️" : "🤍"}
                  </button>
                </div>

                {/* Card Body */}
                <div className="vendor-card-body">
                  <div className="vendor-card-meta-row">
                    <span className="vendor-card-category-tag">
                      {vendor.category || "Event Service"}
                    </span>
                    {vendor.rating && (
                      <div className="vendor-card-rating">
                        <span>★</span>
                        <span>{vendor.rating}</span>
                        {vendor.reviewsCount > 0 && (
                          <span style={{ color: "#059669", fontWeight: 500 }}>
                            ({vendor.reviewsCount})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="vendor-card-title">{vendor.businessName}</h3>

                  {/* Location & Real Distance Prominently Displayed */}
                  <div className="vendor-card-location">
                    <span>📍</span>
                    <span className="vendor-loc-text">{vendor.location || "Pan-India Service"}</span>
                    <span className="vendor-distance-badge">🚗 {distanceLabel}</span>
                  </div>

                  <p className="vendor-card-desc">{vendor.description}</p>

                  {/* Tag Pills & Ongoing Discount Mentions */}
                  {vendor.tags && vendor.tags.length > 0 && (
                    <div className="vendor-card-tags">
                      {vendor.tags.slice(0, 4).map((tag, idx) => {
                        const isSpecial =
                          tag.toLowerCase().includes("off") ||
                          tag.toLowerCase().includes("discount") ||
                          tag.toLowerCase().includes("festive") ||
                          tag.toLowerCase().includes("free");
                        return (
                          <span
                            key={idx}
                            className={`vendor-tag-item ${isSpecial ? "discount-highlight" : ""}`}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Pricing and Action Buttons */}
                  <div className="vendor-card-price-action-row">
                    <div className="vendor-price-block">
                      <span className="vendor-price-label">Starting package</span>
                      <div className="vendor-price-numbers">
                        {hasDiscount && originalInr > effectiveInr && (
                          <span className="vendor-price-original">
                            ₹{Number(originalInr).toLocaleString("en-IN")}
                          </span>
                        )}
                        <span className="vendor-price-current">
                          ₹{Number(effectiveInr).toLocaleString("en-IN")}
                        </span>
                        {hasDiscount && (
                          <span className="vendor-savings-pill">
                            Save {vendor.discountPercent || (originalInr > effectiveInr ? Math.round(((originalInr - effectiveInr) / originalInr) * 100) : 15)}%
                          </span>
                        )}
                      </div>
                      <span className="vendor-escrow-hint">
                        🔒 40% escrow hold • Free reschedule
                      </span>
                    </div>

                    <div className="vendor-card-actions">
                      <button
                        type="button"
                        className="vendor-quick-view-btn"
                        onClick={() => onViewDetails(vendor)}
                        title="View portfolio, all packages & reviews"
                      >
                        Quick View
                      </button>
                      <button
                        type="button"
                        className="vendor-check-avail-btn"
                        onClick={() => onBookNow(vendor)}
                        title="Check availability and request booking"
                      >
                        <span>Check Availability</span>
                        <span className="btn-lightning">⚡</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
