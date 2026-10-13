export function MarketplaceFooter({ onCategoryClick, onNavigateToAuth, onNavigateToVendorPortal }) {
  return (
    <footer className="marketplace-footer" role="contentinfo">
      <div className="marketplace-footer-inner">
        <div className="marketplace-footer-grid">
          {/* Col 1: Brand Info & Escrow Notice */}
          <div className="footer-col">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  color: "#ffffff",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                B
              </div>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#ffffff" }}>
                BookMe
              </span>
            </div>
            <p style={{ fontSize: "0.8125rem", lineHeight: 1.6, color: "#94a3b8", maxWidth: 360, margin: "0 0 16px 0" }}>
              India's premier AI-powered multi-vendor event booking marketplace. Connecting celebration hosts with vetted photography, royal catering, sound, and luxury decor professionals.
            </p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: "0.75rem",
                color: "#cbd5e1",
              }}
            >
              <span>🔒</span>
              <span>40% Escrow Protection • Licensed RBI Gateway</span>
            </div>
          </div>

          {/* Col 2: For Customers */}
          <div className="footer-col">
            <h4>For Event Hosts</h4>
            <ul className="footer-links-list">
              <li>
                <button type="button" onClick={() => onNavigateToAuth && onNavigateToAuth("register")}>
                  Create Free Account
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigateToAuth && onNavigateToAuth("login")}>
                  Track My Bookings
                </button>
              </li>
              <li>
                <span>Event Checklist Planner</span>
              </li>
              <li>
                <span>Escrow & 40% Deposit Policy</span>
              </li>
              <li>
                <span>Cancellation & Refund Matrix</span>
              </li>
              <li>
                <span>Customer Trust & Safety Guide</span>
              </li>
            </ul>
          </div>

          {/* Col 3: For Vendors */}
          <div className="footer-col">
            <h4>For Service Vendors</h4>
            <ul className="footer-links-list">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateToVendorPortal ? onNavigateToVendorPortal() : onNavigateToAuth("register", { role: "vendor" })}
                >
                  Vendor Operating Portal ⚡
                </button>
              </li>
              <li>
                <span>List Packages & Portfolios</span>
              </li>
              <li>
                <span>DigiLocker & Bank KYC</span>
              </li>
              <li>
                <span>Calendar Capacity Management</span>
              </li>
              <li>
                <span>Zero Booking Commission</span>
              </li>
              <li>
                <span>Vendor Code of Conduct</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Popular Categories */}
          <div className="footer-col">
            <h4>Service Categories</h4>
            <ul className="footer-links-list">
              <li>
                <button type="button" onClick={() => onCategoryClick && onCategoryClick("Photography")}>
                  Photography & Videography
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onCategoryClick && onCategoryClick("Catering")}>
                  Catering & Live Counters
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onCategoryClick && onCategoryClick("Decoration")}>
                  Floral Decor & Mandaps
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onCategoryClick && onCategoryClick("DJ & Music")}>
                  DJ & Sound Systems
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onCategoryClick && onCategoryClick("Makeup & Beauty")}>
                  Bridal Makeup & Styling
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onCategoryClick && onCategoryClick("Mehndi Artists")}>
                  Bridal Mehndi Artists
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div>
            &copy; {new Date().getFullYear()} BookMe Platforms Pvt. Ltd. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <span>Privacy Policy</span>
            <span>&bull;</span>
            <span>Terms of Service</span>
            <span>&bull;</span>
            <span>Escrow Agreement</span>
            <span>&bull;</span>
            <span>24/7 In-App Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
