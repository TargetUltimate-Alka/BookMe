import { useState, useEffect, useCallback } from "react";
import "./App.css";
import {
  MyEventsPage,
  CreateEventPage,
  EventDashboardPage,
  MyBookingsPage,
  BookingDetailsPage,
  BookingConfirmationPage,
  VendorRequestsPage,
  VendorRequestDetailsPage,
  AdminBookingsPage,
  AdminBookingDetailsPage,
  BookVendorModal,
  setAuthContext,
} from "./features/events-booking/index.js";
import { VendorDiscovery, VendorDashboard } from "./features/vendor/index.js";
import { MarketplacePage } from "./features/marketplace/index.js";
import {
  AuthProvider,
  useAuth,
  AuthPage,
  UserProfileModal,
  UserProfilePage,
} from "./features/auth/index.js";

// Helper to parse window.location.hash into view and params
function parseHash(hash) {
  if (!hash || hash === "#" || hash === "#/") {
    return { view: "marketplace", params: {} };
  }
  const clean = hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = clean.split("?");
  const view = pathPart || "marketplace";
  const params = {};
  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    for (const [k, v] of searchParams.entries()) {
      params[k] = v;
    }
  }
  return { view, params };
}

// Helper to build window.location.hash from view and params
function buildHash(view, params = {}) {
  let hash = `#/${view}`;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      searchParams.set(k, v);
    }
  });
  const q = searchParams.toString();
  if (q) hash += `?${q}`;
  return hash;
}

const PROTECTED_VIEWS = [
  "events",
  "create-event",
  "event-dashboard",
  "bookings",
  "booking-details",
  "booking-confirmation",
  "profile",
  "vendor-portal",
  "vendor-requests",
  "vendor-request-details",
  "admin-bookings",
  "admin-booking-details",
];

function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const activeRole = user?.role || "customer";

  // Navigation State
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      return parseHash(window.location.hash).view;
    }
    return "marketplace";
  });
  const [selectedEventId, setSelectedEventId] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      return parseHash(window.location.hash).params.eventId || null;
    }
    return null;
  });
  const [selectedBookingId, setSelectedBookingId] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      return parseHash(window.location.hash).params.bookingId || null;
    }
    return null;
  });
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Marketplace filter continuity
  const [marketplaceCategory, setMarketplaceCategory] = useState("all");
  const [marketplaceCity, setMarketplaceCity] = useState("all");

  // Booking Flow & Continuity State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [vendorToBook, setVendorToBook] = useState(null);
  const [pendingBookingIntent, setPendingBookingIntent] = useState(() => {
    try {
      const stored = sessionStorage.getItem("bookme_pending_booking");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Auth Page Options
  const [authTab, setAuthTab] = useState("login");
  const [authRole, setAuthRole] = useState("customer");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Core navigation function that synchronizes Browser History (popstate / back arrow)
  const navigateTo = useCallback((view, params = {}, replace = false) => {
    const targetHash = buildHash(view, params);
    if (replace) {
      window.history.replaceState({ view, params }, "", targetHash);
    } else if (window.location.hash !== targetHash) {
      window.history.pushState({ view, params }, "", targetHash);
    }

    setCurrentView(view);
    if (params.eventId !== undefined) setSelectedEventId(params.eventId);
    if (params.bookingId !== undefined) setSelectedBookingId(params.bookingId);
    if (params.tab !== undefined) setAuthTab(params.tab);
    if (params.role !== undefined) setAuthRole(params.role);
    if (params.category !== undefined) setMarketplaceCategory(params.category);
    if (params.city !== undefined) setMarketplaceCity(params.city);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Listen for Browser Back (<-) and Forward (->) navigation buttons
  useEffect(() => {
    const handlePopState = () => {
      const { view, params } = parseHash(window.location.hash);
      setCurrentView(view);
      if (params.eventId !== undefined) setSelectedEventId(params.eventId);
      if (params.bookingId !== undefined) setSelectedBookingId(params.bookingId);
      if (params.tab !== undefined) setAuthTab(params.tab);
      if (params.role !== undefined) setAuthRole(params.role);
      if (params.category !== undefined) setMarketplaceCategory(params.category);
      if (params.city !== undefined) setMarketplaceCity(params.city);
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);

    // Initial load setup
    if (window.location.hash) {
      const { view, params } = parseHash(window.location.hash);
      setCurrentView(view);
      if (params.eventId) setSelectedEventId(params.eventId);
      if (params.bookingId) setSelectedBookingId(params.bookingId);
      if (params.tab) setAuthTab(params.tab);
      if (params.role) setAuthRole(params.role);
    } else {
      window.history.replaceState({ view: "marketplace" }, "", "#/marketplace");
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  // Sync client auth context & handle post-login redirection
  useEffect(() => {
    if (user && user.id) {
      setAuthContext(user.id, user.role);

      // Check if there was a pending booking intent when signing in
      let savedIntent = pendingBookingIntent;
      if (!savedIntent) {
        try {
          const raw = sessionStorage.getItem("bookme_pending_booking");
          if (raw) savedIntent = JSON.parse(raw);
        } catch {
          // ignore
        }
      }

      if (savedIntent) {
        // Resume booking flow immediately!
        setVendorToBook(savedIntent);
        setIsBookModalOpen(true);
        setPendingBookingIntent(null);
        try {
          sessionStorage.removeItem("bookme_pending_booking");
        } catch {
          // ignore
        }
        if (user.role === "customer") {
          navigateTo("marketplace", {}, true);
        }
        return;
      }

      // If user signed in from auth view: REDIRECT TO THEIR ROLE HOME!
      if (currentView === "auth") {
        if (user.role === "vendor") {
          navigateTo("vendor-portal", {}, true);
        } else if (user.role === "admin") {
          navigateTo("admin-bookings", {}, true);
        } else {
          // Customer sign-in should take them directly to their own profile!
          navigateTo("profile", {}, true);
        }
      }
    }
  }, [user, currentView, pendingBookingIntent, navigateTo]);

  // Protected Routes & RBAC Guard:
  // 1. Signed out user accessing private views -> marketplace
  // 2. Customer user accessing vendor operational portal -> profile with security protection
  useEffect(() => {
    if (!isLoading && !isAuthenticated && PROTECTED_VIEWS.includes(currentView)) {
      navigateTo("marketplace", {}, true);
    }
    if (isAuthenticated && activeRole === "customer" && (currentView === "vendor-portal" || currentView === "vendor-requests" || currentView === "vendor-request-details")) {
      navigateTo("profile", {}, true);
    }
  }, [isLoading, isAuthenticated, activeRole, currentView, navigateTo]);

  // Complete sign-out and session invalidation
  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Continue client cleanup even on network failure
    }
    setSelectedEventId(null);
    setSelectedBookingId(null);
    setConfirmedBooking(null);
    setIsBookModalOpen(false);
    setIsProfileModalOpen(false);
    navigateTo("marketplace", {}, true);
  };

  // Unified Book Now handler with guest continuity
  const handleBookNow = useCallback(
    (catalogItem, pkg = null) => {
      const bookingData = {
        vendorId: catalogItem.id || "vnd_sunset_caterers",
        vendorName: catalogItem.businessName || catalogItem.title,
        packageName:
          pkg?.name ||
          (catalogItem.category
            ? `${catalogItem.category} Package`
            : "Standard Package"),
        category: catalogItem.category || "Catering",
        price: pkg?.price || catalogItem.basePrice || catalogItem.price || 45000,
        packageId: pkg?.id,
      };

      if (!isAuthenticated) {
        // Guest user: save booking intent and redirect to sign in
        setPendingBookingIntent(bookingData);
        try {
          sessionStorage.setItem("bookme_pending_booking", JSON.stringify(bookingData));
        } catch {
          // ignore
        }
        setAuthTab("login");
        navigateTo("auth", { tab: "login" });
        return;
      }

      // Authenticated user: open book modal directly
      setVendorToBook(bookingData);
      setIsBookModalOpen(true);
    },
    [isAuthenticated, navigateTo]
  );

  // 1. Initial authentication loading state
  if (isLoading) {
    return (
      <div
        className="page-shell"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            className="brand-mark"
            style={{
              margin: "0 auto 1.5rem auto",
              width: 56,
              height: 56,
              fontSize: 24,
            }}
          >
            B
          </div>
          <p style={{ fontWeight: 600, color: "#4b5563" }}>
            Verifying BookMe session...
          </p>
        </div>
      </div>
    );
  }

  // 2. Authentication View (Sign In / Register)
  if (currentView === "auth") {
    return (
      <div className="page-shell" style={{ padding: "20px 24px" }}>
        <header
          className="topbar"
          style={{ marginBottom: "2rem", width: "min(600px, 100%)" }}
        >
          <div
            className="brand-wrap cursor-pointer"
            onClick={() => navigateTo("marketplace")}
          >
            <div className="brand-mark">B</div>
            <div>
              <p className="brand-name">BookMe</p>
              <span className="brand-subtitle">Event Operating Platform</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <button
              type="button"
              className="marketplace-header-btn ghost"
              onClick={() => navigateTo("marketplace")}
              style={{ fontSize: "0.85rem" }}
            >
              ← Back to Marketplace
            </button>
          </div>
        </header>

        <main className="content-area">
          <AuthPage
            defaultTab={authTab}
            defaultRole={authRole}
            bookingIntent={pendingBookingIntent}
            onCancel={() => {
              setPendingBookingIntent(null);
              navigateTo("marketplace");
            }}
            onLoginSuccess={() => {
              // Continuity and profile redirect handled in user sync useEffect
            }}
          />
        </main>
      </div>
    );
  }

  // 3. Guest Browsing Mode or Authenticated Marketplace Home
  if (currentView === "marketplace") {
    return (
      <>
        <MarketplacePage
          user={user}
          isAuthenticated={isAuthenticated}
          initialCategory={marketplaceCategory}
          initialLocation={marketplaceCity}
          onBookNow={handleBookNow}
          onNavigateToAuth={(tab, options = {}) => {
            navigateTo("auth", { tab: tab || "login", role: options.role || "customer" });
          }}
          onNavigateToBookings={() => {
            if (isAuthenticated) navigateTo("bookings");
            else navigateTo("auth", { tab: "login" });
          }}
          onNavigateToEvents={() => {
            if (isAuthenticated) navigateTo("events");
            else navigateTo("auth", { tab: "login" });
          }}
          onNavigateToVendorPortal={() => {
            if (isAuthenticated && user?.role === "vendor") {
              navigateTo("vendor-portal");
            } else {
              navigateTo("auth", { tab: "login", role: "vendor" });
            }
          }}
          onOpenProfile={() => navigateTo("profile")}
          onLogout={handleLogout}
        />

        {/* Book Vendor Modal */}
        {isBookModalOpen && (
          <BookVendorModal
            isOpen={isBookModalOpen}
            onClose={() => setIsBookModalOpen(false)}
            vendorInfo={vendorToBook}
            onCreateNewEvent={() => {
              setIsBookModalOpen(false);
              navigateTo("create-event");
            }}
            onSuccess={(bkg) => {
              setIsBookModalOpen(false);
              setSelectedBookingId(bkg.id);
              navigateTo("booking-details", { bookingId: bkg.id });
            }}
          />
        )}

        {/* User Profile Modal */}
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      </>
    );
  }

  // 4. Authenticated Application Shell (Customer Events, Bookings, User Profile, Vendor Portal, Admin Oversight)

  return (
    <div className="page-shell">
      <header className="topbar">
        <div
          className="brand-wrap cursor-pointer"
          onClick={() => navigateTo("marketplace")}
          title="Return to BookMe Marketplace"
        >
          <div className="brand-mark">B</div>
          <div>
            <p className="brand-name">BookMe</p>
            <span className="brand-subtitle">Event Operating Platform</span>
          </div>
        </div>

        {/* Navigation Tabs based on role */}
        <nav className="main-nav" aria-label="Main navigation">
          {/* Marketplace shortcut for everyone */}
          <button
            type="button"
            className={currentView === "marketplace" ? "active" : ""}
            onClick={() => navigateTo("marketplace")}
          >
            Marketplace ⚡
          </button>

          {activeRole === "customer" && (
            <>
              <button
                type="button"
                className={currentView === "events" ? "active" : ""}
                onClick={() => navigateTo("events")}
              >
                My Events
              </button>

              <button
                type="button"
                className={currentView === "bookings" ? "active" : ""}
                onClick={() => navigateTo("bookings")}
              >
                My Bookings
              </button>

              <button
                type="button"
                className={currentView === "create-event" ? "active" : ""}
                onClick={() => navigateTo("create-event")}
              >
                Create Event
              </button>

              <button
                type="button"
                className={currentView === "discover" ? "active" : ""}
                onClick={() => navigateTo("discover")}
              >
                Find Vendors
              </button>

              <button
                type="button"
                className={currentView === "profile" ? "active" : ""}
                onClick={() => navigateTo("profile")}
              >
                My Profile
              </button>
            </>
          )}

          {activeRole === "vendor" && (
            <>
              <button
                type="button"
                className={currentView === "vendor-portal" ? "active" : ""}
                onClick={() => navigateTo("vendor-portal")}
              >
                Operating Portal
              </button>

              <button
                type="button"
                className={currentView === "vendor-requests" ? "active" : ""}
                onClick={() => navigateTo("vendor-requests")}
              >
                Event Bookings
              </button>

              <button
                type="button"
                className={currentView === "profile" ? "active" : ""}
                onClick={() => navigateTo("profile")}
              >
                Vendor Profile
              </button>
            </>
          )}

          {activeRole === "admin" && (
            <>
              <button
                type="button"
                className={currentView === "admin-bookings" ? "active" : ""}
                onClick={() => navigateTo("admin-bookings")}
              >
                Platform Oversight
              </button>
              <button
                type="button"
                className={currentView === "profile" ? "active" : ""}
                onClick={() => navigateTo("profile")}
              >
                Admin Profile
              </button>
            </>
          )}
        </nav>

        {/* Topbar User Profile & Actions */}
        <div
          className="topbar-actions"
          style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
        >
          {user && (
            <div
              onClick={() => navigateTo("profile")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                background: currentView === "profile" ? "#e0e7ff" : "#f8fafc",
                border: currentView === "profile" ? "1px solid #6366f1" : "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "0.3rem 0.65rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Click to view My Profile"
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background:
                    activeRole === "vendor"
                      ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                      : "linear-gradient(135deg, #ff5a36, #f4b740)",
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
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#1e293b",
                    maxWidth: 120,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.name}
                </div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "capitalize",
                  }}
                >
                  {activeRole === "vendor" ? "🏢 Vendor" : "👤 Profile"}
                </div>
              </div>
            </div>
          )}

          {activeRole === "customer" && (
            <button
              className="primary-button"
              type="button"
              onClick={() => navigateTo("create-event")}
            >
              + Create Event
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1px solid #e2e8f0",
              color: "#64748b",
              borderRadius: "8px",
              padding: "0.4rem 0.65rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Sign out of BookMe"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="content-area">
        {/* USER PROFILE VIEW */}
        {currentView === "profile" && (
          <UserProfilePage
            onNavigateToEvents={() => navigateTo("events")}
            onNavigateToBookings={() => navigateTo("bookings")}
            onNavigateToMarketplace={() => navigateTo("marketplace")}
            onNavigateToCreateEvent={() => navigateTo("create-event")}
            onNavigateToVendorPortal={() => navigateTo("vendor-portal")}
            onLogout={handleLogout}
          />
        )}

        {/* CUSTOMER VIEWS */}
        {currentView === "events" && (
          <MyEventsPage
            onCreateEvent={() => navigateTo("create-event")}
            onSelectEvent={(id) => {
              navigateTo("event-dashboard", { eventId: id });
            }}
          />
        )}

        {currentView === "create-event" && (
          <CreateEventPage
            onEventCreated={(ev) => {
              navigateTo("event-dashboard", { eventId: ev.id });
            }}
            onNavigateBack={() => navigateTo("events")}
          />
        )}

        {currentView === "event-dashboard" && (
          <EventDashboardPage
            eventId={selectedEventId}
            onNavigateBack={() => navigateTo("events")}
            onNavigateToBooking={(id) => {
              navigateTo("booking-details", { bookingId: id });
            }}
            onFindVendors={(filters) => {
              navigateTo("marketplace", filters || {});
            }}
            onSelectEvent={(id) => {
              navigateTo("event-dashboard", { eventId: id });
            }}
          />
        )}

        {currentView === "bookings" && (
          <MyBookingsPage
            onSelectBooking={(id) => {
              navigateTo("booking-details", { bookingId: id });
            }}
            onNavigateToEvents={() => navigateTo("events")}
          />
        )}

        {currentView === "booking-details" && (
          <BookingDetailsPage
            bookingId={selectedBookingId}
            onNavigateBack={() => {
              if (activeRole === "customer") navigateTo("bookings");
              else if (activeRole === "vendor") navigateTo("vendor-requests");
              else navigateTo("admin-bookings");
            }}
            onPaymentSuccess={(bkg) => {
              setConfirmedBooking(bkg);
              navigateTo("booking-confirmation");
            }}
          />
        )}

        {currentView === "booking-confirmation" && (
          <BookingConfirmationPage
            booking={confirmedBooking}
            onNavigateToBookings={() => navigateTo("bookings")}
            onNavigateToEvents={() => navigateTo("events")}
          />
        )}

        {/* VENDOR OPERATING PORTAL & INQUIRIES */}
        {currentView === "vendor-portal" && (
          <VendorDashboard
            onSwitchToMarketplace={() => navigateTo("marketplace")}
          />
        )}

        {currentView === "vendor-requests" && (
          <VendorRequestsPage
            onSelectRequest={(id) => {
              navigateTo("vendor-request-details", { bookingId: id });
            }}
          />
        )}

        {currentView === "vendor-request-details" && (
          <VendorRequestDetailsPage
            bookingId={selectedBookingId}
            onNavigateBack={() => navigateTo("vendor-requests")}
          />
        )}

        {/* ADMIN VIEWS */}
        {currentView === "admin-bookings" && (
          <AdminBookingsPage
            onSelectBooking={(id) => {
              navigateTo("admin-booking-details", { bookingId: id });
            }}
          />
        )}

        {currentView === "admin-booking-details" && (
          <AdminBookingDetailsPage
            bookingId={selectedBookingId}
            onNavigateBack={() => navigateTo("admin-bookings")}
          />
        )}

        {/* DISCOVER VENDORS VIEW */}
        {currentView === "discover" && (
          <VendorDiscovery
            onSelectVendor={(v) => handleBookNow(v)}
            onOpenVendorPortal={activeRole === "vendor" || activeRole === "admin" ? () => navigateTo("vendor-portal") : null}
          />
        )}
      </main>

      {/* Book Vendor Modal */}
      {isBookModalOpen && (
        <BookVendorModal
          isOpen={isBookModalOpen}
          onClose={() => setIsBookModalOpen(false)}
          vendorInfo={vendorToBook}
          onCreateNewEvent={() => {
            setIsBookModalOpen(false);
            navigateTo("create-event");
          }}
          onSuccess={(bkg) => {
            setIsBookModalOpen(false);
            setSelectedBookingId(bkg.id);
            navigateTo("booking-details", { bookingId: bkg.id });
          }}
        />
      )}

      {/* User Profile / Account Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
