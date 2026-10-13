import { useState } from "react";

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

export function MarketplaceHeader({
  searchQuery,
  onSearchChange,
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
}) {
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const selectedLocObj =
    INDIAN_LOCATIONS.find((l) => l.id === selectedLocation) || INDIAN_LOCATIONS[0];

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

        {/* Search Bar (Flipkart style) */}
        <div className="marketplace-search-wrap">
          <div className="marketplace-search-input-box">
            <span style={{ color: "#94a3b8", fontSize: "1rem", marginRight: 6 }}>🔍</span>
            <input
              type="text"
              className="marketplace-search-input"
              placeholder="Search wedding photographers, royal caterers, DJs, floral decor..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search vendor or service"
            />
            {searchQuery && (
              <button
                type="button"
                className="marketplace-search-clear"
                onClick={() => onSearchChange("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
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
