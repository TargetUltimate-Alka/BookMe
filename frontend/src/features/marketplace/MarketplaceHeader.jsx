import { useState, useRef, useEffect } from "react";
import { SUPPORTED_CATEGORIES } from "./MarketplaceCategories";

export const INDIAN_LOCATIONS = [
  { id: "all", label: "All Cities (Pan-India)" },
  { id: "Ahmedabad", label: "Ahmedabad, Gujarat" },
  { id: "Mumbai", label: "Mumbai, Maharashtra" },
  { id: "Delhi NCR", label: "Delhi NCR" },
  { id: "Bengaluru", label: "Bengaluru, Karnataka" },
  { id: "Jaipur", label: "Jaipur, Rajasthan" },
  { id: "Pune", label: "Pune, Maharashtra" },
  { id: "Hyderabad", label: "Hyderabad, Telangana" },
  { id: "Goa", label: "Goa (Destination)" },
  { id: "Udaipur", label: "Udaipur, Rajasthan" },
];

const POPULAR_SEARCHES = [
  { text: "Royal Wedding Caterers", category: "Catering", icon: "🍲", highlight: "Live Chaat & Multi-Cuisine" },
  { text: "Candid Wedding Photography & Drone", category: "Photography", icon: "📸", highlight: "4K Cinema & Reels" },
  { text: "DJ with Cold Pyro & Fog Sparks", category: "DJ & Music", icon: "🎧", highlight: "Line Array & Sangeet Audio" },
  { text: "Bridal HD Airbrush Makeup", category: "Makeup & Beauty", icon: "💄", highlight: "Celebrity Makeover & Hair Styling" },
  { text: "Floral Mandap & Stage Decors", category: "Decoration", icon: "💐", highlight: "Royal Marigold & LED Tunnel" },
  { text: "Rajasthani & Arabic Mehndi", category: "Mehndi Artists", icon: "✨", highlight: "Organic Herbal Bridal Henna" },
  { text: "German Pagoda & Luxury AC Tents", category: "Tents & Event Setup", icon: "⛺", highlight: "Shamianas & Velvet Sofas" },
  { text: "Vintage Wedding Cars for Baraat", category: "Transportation", icon: "🚗", highlight: "Chauffeur Driven Convertibles" },
  { text: "Live Delhi Chaat & Food Counters", category: "Catering", icon: "🍲", highlight: "Pani Puri, Dahi Bhalla & Chefs" },
];

export function MarketplaceHeader({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  selectedLocation,
  onLocationChange,
  user,
  isAuthenticated,
  wishlistCount = 0,
  onOpenWishlist,
  onNavigateToAuth,
  onNavigateToBookings,
  onNavigateToEvents,
  onNavigateToVendorPortal,
  onOpenProfile,
  onLogout,
  onBrandClick,
  vendors = [],
  onSelectVendor,
  onSelectCategory,
}) {
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchWrapRef = useRef(null);

  const selectedLocObj =
    INDIAN_LOCATIONS.find((l) => l.id === selectedLocation) || INDIAN_LOCATIONS[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const q = (searchQuery || "").trim().toLowerCase();

  // Top category chips matching query
  const matchingCategories = SUPPORTED_CATEGORIES.filter((c) => {
    if (c.id === "all") return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.tagline && c.tagline.toLowerCase().includes(q))
    );
  }).slice(0, 5);

  // Suggested search queries
  const matchingSuggestions = q
    ? POPULAR_SEARCHES.filter(
        (s) =>
          s.text.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.highlight.toLowerCase().includes(q)
      ).slice(0, 5)
    : POPULAR_SEARCHES.slice(0, 5);

  // Matching verified vendors
  const matchingVendors = q && Array.isArray(vendors)
    ? vendors
        .filter((v) => {
          const hay = `${v.businessName} ${v.category} ${v.description} ${v.location} ${(v.tags || []).join(" ")}`.toLowerCase();
          return hay.includes(q);
        })
        .slice(0, 4)
    : [];

  return (
    <header className="marketplace-header" role="banner">
      <div className="marketplace-header-inner">
        {/* Brand Logo & Name */}
        <div
          className="marketplace-brand"
          onClick={onBrandClick}
          title="BookMe - Home"
          role="button"
          tabIndex={0}
        >
          <div className="marketplace-brand-logo">B</div>
          <div className="marketplace-brand-info">
            <span className="marketplace-brand-name">BookMe</span>
            <span className="marketplace-brand-tagline">Event Marketplace</span>
          </div>
        </div>

        {/* Location Dropdown (Blinkit style) */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="marketplace-location-btn"
            onClick={() => setShowLocationMenu((prev) => !prev)}
            aria-expanded={showLocationMenu}
            aria-label="Select event city"
          >
            <span>📍</span>
            <span>City:</span>
            <span className="city-name">{selectedLocObj.id === "all" ? "All India" : selectedLocObj.id}</span>
            <span style={{ fontSize: "0.65rem", marginLeft: 2 }}>▼</span>
          </button>

          {showLocationMenu && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 10px 25px rgba(15, 23, 42, 0.15)",
                width: 220,
                zIndex: 200,
                overflow: "hidden",
                padding: "6px 0",
              }}
            >
              <div
                style={{
                  padding: "6px 14px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                Select Event Location
              </div>
              {INDIAN_LOCATIONS.map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => {
                    onLocationChange(loc.id);
                    setShowLocationMenu(false);
                  }}
                  style={{
                    padding: "8px 14px",
                    fontSize: "0.8125rem",
                    fontWeight: selectedLocation === loc.id ? 700 : 500,
                    color: selectedLocation === loc.id ? "#4f46e5" : "#1e293b",
                    background: selectedLocation === loc.id ? "#eef2ff" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{loc.label}</span>
                  {selectedLocation === loc.id && <span>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Bar with Autocomplete & Smart Suggestions */}
        <div className="marketplace-search-wrap" ref={searchWrapRef}>
          <div className="marketplace-search-input-box">
            <button
              type="button"
              onClick={() => {
                setIsSearchFocused(false);
                if (onSearchSubmit) onSearchSubmit(searchQuery);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              title="Search vendors"
              aria-label="Submit search"
            >
              <span style={{ color: isSearchFocused ? "#4f46e5" : "#94a3b8", fontSize: "1rem", marginRight: 6, transition: "color 0.2s" }}>
                🔍
              </span>
            </button>
            <input
              type="text"
              className="marketplace-search-input"
              placeholder="Search wedding photographers, royal caterers, DJs, floral decor..."
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsSearchFocused(false);
                } else if (e.key === "Enter") {
                  setIsSearchFocused(false);
                  if (onSearchSubmit) onSearchSubmit(searchQuery);
                }
              }}
              aria-label="Search vendor or service"
              aria-expanded={isSearchFocused}
              aria-haspopup="listbox"
            />
            {searchQuery && (
              <button
                type="button"
                className="marketplace-search-clear"
                onClick={() => {
                  onSearchChange("");
                  setIsSearchFocused(true);
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {isSearchFocused && (
            <div className="marketplace-search-dropdown" role="listbox">
              {/* Category Quick Chips */}
              <div className="search-dropdown-section">
                <div className="search-dropdown-section-title">
                  <span>Categories</span>
                  <span style={{ fontSize: "0.625rem", color: "#94a3b8" }}>Quick Filter</span>
                </div>
                <div className="search-category-chips">
                  {matchingCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className="search-category-chip"
                      onClick={() => {
                        if (onSelectCategory) onSelectCategory(cat.id);
                        onSearchChange(cat.id);
                        setIsSearchFocused(false);
                        if (onSearchSubmit) onSearchSubmit(cat.id);
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Matching / Trending Searches */}
              <div className="search-dropdown-section">
                <div className="search-dropdown-section-title">
                  <span>{q ? "Suggested Searches" : "🔥 Trending Celebrations"}</span>
                  <span style={{ fontSize: "0.625rem", color: "#6366f1" }}>Instant Match</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {matchingSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      className="search-suggestion-item"
                      onClick={() => {
                        onSearchChange(item.text);
                        if (onSelectCategory) onSelectCategory(item.category);
                        setIsSearchFocused(false);
                        if (onSearchSubmit) onSearchSubmit(item.text);
                      }}
                    >
                      <div className="search-suggestion-left">
                        <span>{item.icon}</span>
                        <span className="search-suggestion-text">{item.text}</span>
                        <span className="search-suggestion-meta">• {item.highlight}</span>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>↗</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matching Verified Vendors (Direct Jump) */}
              {matchingVendors.length > 0 && (
                <div className="search-dropdown-section">
                  <div className="search-dropdown-section-title">
                    <span>🛡️ Verified Professionals</span>
                    <span style={{ fontSize: "0.625rem", color: "#10b981" }}>Direct View</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {matchingVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        className="search-vendor-item"
                        onClick={() => {
                          if (onSelectVendor) {
                            onSelectVendor(vendor);
                          } else {
                            onSearchChange(vendor.businessName);
                          }
                          setIsSearchFocused(false);
                        }}
                      >
                        {vendor.coverImage ? (
                          <img
                            src={vendor.coverImage}
                            alt={vendor.businessName}
                            className="search-vendor-avatar"
                          />
                        ) : (
                          <div className="search-vendor-avatar">💼</div>
                        )}
                        <div className="search-vendor-info">
                          <div className="search-vendor-name-row">
                            <span className="search-vendor-name">{vendor.businessName}</span>
                            <span className="search-vendor-verified">✓ Verified</span>
                          </div>
                          <div className="search-vendor-meta-row">
                            <span>⭐ {vendor.rating || 4.9}</span>
                            <span>•</span>
                            <span>{vendor.category}</span>
                            <span>•</span>
                            <span>📍 {vendor.location}</span>
                          </div>
                        </div>
                        <div className="search-vendor-price">
                          From ₹{(vendor.basePrice || 25000).toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* City Quick Filter Prompt */}
              {q && selectedLocation !== "all" && (
                <div className="search-dropdown-section" style={{ background: "#f8fafc" }}>
                  <div
                    className="search-suggestion-item"
                    style={{ padding: "6px 8px" }}
                    onClick={() => {
                      onSearchChange(`${q} in ${selectedLocObj.id}`);
                      setIsSearchFocused(false);
                    }}
                  >
                    <div className="search-suggestion-left">
                      <span>📍</span>
                      <span style={{ fontWeight: 600, color: "#4f46e5" }}>
                        Search "{searchQuery}" specifically in {selectedLocObj.id}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#4f46e5" }}>Filter →</span>
                  </div>
                </div>
              )}

              {/* Footer Tip */}
              <div className="search-dropdown-footer">
                <span>💡 Tip: Try "DJ in Ahmedabad" or "Chaat"</span>
                <span>Press ↵ Enter to search</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="marketplace-header-actions">
          {/* Wishlist Button */}
          <button
            type="button"
            className="marketplace-wishlist-btn"
            onClick={onOpenWishlist}
            title="View Saved Vendors"
            aria-label="Wishlist"
          >
            <span>❤️</span>
            {wishlistCount > 0 && (
              <span className="marketplace-badge-count">{wishlistCount}</span>
            )}
          </button>

          {/* Guest Navigation */}
          {!isAuthenticated ? (
            <>
              <button
                type="button"
                className="marketplace-header-btn ghost"
                onClick={() => onNavigateToAuth("login", { redirectAfter: "bookings" })}
              >
                My Bookings
              </button>
              <button
                type="button"
                className="marketplace-header-btn outline"
                onClick={() => onNavigateToAuth("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className="marketplace-header-btn primary"
                onClick={() => onNavigateToAuth("register")}
              >
                Create Account
              </button>
            </>
          ) : (
            <>
              {/* Authenticated Customer Navigation */}
              {user.role === "customer" && (
                <>
                  <button
                    type="button"
                    className="marketplace-header-btn ghost"
                    onClick={onNavigateToEvents}
                  >
                    My Events
                  </button>
                  <button
                    type="button"
                    className="marketplace-header-btn ghost"
                    onClick={onNavigateToBookings}
                  >
                    My Bookings
                  </button>
                </>
              )}

              {/* Authenticated Vendor Navigation */}
              {user.role === "vendor" && (
                <button
                  type="button"
                  className="marketplace-header-btn outline"
                  onClick={onNavigateToVendorPortal}
                >
                  Operating Portal 🏢
                </button>
              )}

              {/* User Profile Badge */}
              <div
                onClick={onOpenProfile}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
                title="View Account Profile"
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background:
                      user.role === "vendor"
                        ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                        : "linear-gradient(135deg, #4f46e5, #6366f1)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
                <div style={{ textAlign: "left", lineHeight: 1.15 }}>
                  <div
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                      color: "#1e293b",
                      maxWidth: 110,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "capitalize",
                    }}
                  >
                    {user.role}
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <button
                type="button"
                className="marketplace-header-btn ghost"
                style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                onClick={onLogout}
                title="Sign out of BookMe"
              >
                Sign Out
              </button>
            </>
          )}

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            className="marketplace-wishlist-btn"
            style={{ display: "none" }}
            id="mobile-menu-toggle"
            onClick={() => setShowMobileMenu((prev) => !prev)}
            aria-label="Toggle mobile menu"
          >
            {showMobileMenu ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {showMobileMenu && (
        <div
          style={{
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {!isAuthenticated ? (
            <>
              <button
                type="button"
                className="marketplace-header-btn outline"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  setShowMobileMenu(false);
                  onNavigateToAuth("login");
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className="marketplace-header-btn primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  setShowMobileMenu(false);
                  onNavigateToAuth("register");
                }}
              >
                Create Account
              </button>
            </>
          ) : (
            <>
              {user.role === "customer" && (
                <>
                  <button
                    type="button"
                    className="marketplace-header-btn ghost"
                    onClick={() => {
                      setShowMobileMenu(false);
                      onNavigateToEvents();
                    }}
                  >
                    My Events
                  </button>
                  <button
                    type="button"
                    className="marketplace-header-btn ghost"
                    onClick={() => {
                      setShowMobileMenu(false);
                      onNavigateToBookings();
                    }}
                  >
                    My Bookings
                  </button>
                </>
              )}
              {user.role === "vendor" && (
                <button
                  type="button"
                  className="marketplace-header-btn outline"
                  onClick={() => {
                    setShowMobileMenu(false);
                    onNavigateToVendorPortal();
                  }}
                >
                  Vendor Portal
                </button>
              )}
              <button
                type="button"
                className="marketplace-header-btn ghost"
                onClick={() => {
                  setShowMobileMenu(false);
                  onLogout();
                }}
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
