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
} from "./features/auth/index.js";

function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Navigation View: 'marketplace' | 'events' | 'create-event' | 'event-dashboard' |
  // 'bookings' | 'booking-details' | 'booking-confirmation' | 'vendor-portal' |
  // 'vendor-requests' | 'vendor-request-details' | 'admin-bookings' | 'admin-booking-details' |
  // 'discover' | 'auth'
  const [currentView, setCurrentView] = useState("marketplace");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

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

  // Sync client auth context & resume pending bookings upon login
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
          setCurrentView("marketplace");
        }
        return;
      }

      // If user signed in normally without pending booking intent
      if (currentView === "auth") {
        if (user.role === "vendor") {
          setCurrentView("vendor-portal");
        } else if (user.role === "admin") {
          setCurrentView("admin-bookings");
        } else {
          setCurrentView("marketplace");
        }
      }
    }
  }, [user, currentView, pendingBookingIntent]);

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
        setCurrentView("auth");
        return;
      }

      // Authenticated user: open book modal directly
      setVendorToBook(bookingData);
      setIsBookModalOpen(true);
    },
    [isAuthenticated]
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

  // 2. Authentication View (when user explicitly clicks Sign In / Sign Up, or is redirected for booking)
  if (currentView === "auth") {
    return (
      <div className="page-shell" style={{ padding: "20px 24px" }}>
        <header
          className="topbar"
          style={{ marginBottom: "2rem", width: "min(600px, 100%)" }}
        >
          <div
            className="brand-wrap cursor-pointer"
            onClick={() => setCurrentView("marketplace")}
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
              onClick={() => setCurrentView("marketplace")}
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
              setCurrentView("marketplace");
            }}
            onLoginSuccess={() => {
              // Continuity is handled in user sync useEffect
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
          onBookNow={handleBookNow}
          onNavigateToAuth={(tab, options = {}) => {
            setAuthTab(tab || "login");
            if (options.role) setAuthRole(options.role);
            setCurrentView("auth");
          }}
          onNavigateToBookings={() => {
            if (isAuthenticated) setCurrentView("bookings");
            else {
              setAuthTab("login");
              setCurrentView("auth");
            }
          }}
          onNavigateToEvents={() => {
            if (isAuthenticated) setCurrentView("events");
            else {
              setAuthTab("login");
              setCurrentView("auth");
            }
          }}
          onNavigateToVendorPortal={() => {
            if (isAuthenticated && user?.role === "vendor") {
              setCurrentView("vendor-portal");
            } else {
              setAuthTab("login");
              setAuthRole("vendor");
              setCurrentView("auth");
            }
          }}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onLogout={logout}
        />

        {/* Book Vendor Modal */}
        {isBookModalOpen && (
          <BookVendorModal
            isOpen={isBookModalOpen}
            onClose={() => setIsBookModalOpen(false)}
            vendorInfo={vendorToBook}
            onCreateNewEvent={() => {
              setIsBookModalOpen(false);
              setCurrentView("create-event");
            }}
            onSuccess={(bkg) => {
              setIsBookModalOpen(false);
              setSelectedBookingId(bkg.id);
              setCurrentView("booking-details");
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

  // 4. Authenticated Application Shell (Customer Events, Bookings, Vendor Portal, Admin Oversight)
  const activeRole = user?.role || "customer";

  return (
    <div className="page-shell">
      <header className="topbar">
        <div
          className="brand-wrap cursor-pointer"
          onClick={() => setCurrentView("marketplace")}
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
            onClick={() => setCurrentView("marketplace")}
          >
            Marketplace ⚡
          </button>

          {activeRole === "customer" && (
            <>
              <button
                type="button"
                className={currentView === "events" ? "active" : ""}
                onClick={() => setCurrentView("events")}
              >
                My Events
              </button>

              <button
                type="button"
                className={currentView === "bookings" ? "active" : ""}
                onClick={() => setCurrentView("bookings")}
              >
                My Bookings
              </button>

              <button
                type="button"
                className={currentView === "create-event" ? "active" : ""}
                onClick={() => setCurrentView("create-event")}
              >
                Create Event
              </button>

              <button
                type="button"
                className={currentView === "discover" ? "active" : ""}
                onClick={() => setCurrentView("discover")}
              >
                Find Vendors
              </button>
            </>
          )}

          {activeRole === "vendor" && (
            <>
              <button
                type="button"
                className={currentView === "vendor-portal" ? "active" : ""}
                onClick={() => setCurrentView("vendor-portal")}
              >
                Operating Portal
              </button>

              <button
                type="button"
                className={currentView === "vendor-requests" ? "active" : ""}
                onClick={() => setCurrentView("vendor-requests")}
              >
                Event Bookings
              </button>
            </>
          )}

          {activeRole === "admin" && (
            <button
              type="button"
              className={currentView === "admin-bookings" ? "active" : ""}
              onClick={() => setCurrentView("admin-bookings")}
            >
              Platform Oversight
            </button>
          )}
        </nav>

        {/* Topbar User Profile & Actions */}
        <div
          className="topbar-actions"
          style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
        >
          {user && (
            <div
              onClick={() => setIsProfileModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "0.3rem 0.65rem",
                cursor: "pointer",
              }}
              title="Click to view or edit profile"
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background:
                    activeRole === "vendor"
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
                  {activeRole === "vendor" ? "🏢 Vendor" : "👤 Customer"}
                </div>
              </div>
            </div>
          )}

          {activeRole === "customer" && (
            <button
              className="primary-button"
              type="button"
              onClick={() => setCurrentView("create-event")}
            >
              + Create Event
            </button>
          )}

          <button
            type="button"
            onClick={logout}
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
        {/* CUSTOMER VIEWS */}
        {currentView === "events" && (
          <MyEventsPage
            onCreateEvent={() => setCurrentView("create-event")}
            onSelectEvent={(id) => {
              setSelectedEventId(id);
              setCurrentView("event-dashboard");
            }}
          />
        )}

        {currentView === "create-event" && (
          <CreateEventPage
            onEventCreated={(ev) => {
              setSelectedEventId(ev.id);
              setCurrentView("event-dashboard");
            }}
            onNavigateBack={() => setCurrentView("events")}
          />
        )}

        {currentView === "event-dashboard" && (
          <EventDashboardPage
            eventId={selectedEventId}
            onNavigateBack={() => setCurrentView("events")}
            onNavigateToBooking={(id) => {
              setSelectedBookingId(id);
              setCurrentView("booking-details");
            }}
            onFindVendors={() => setCurrentView("marketplace")}
          />
        )}

        {currentView === "bookings" && (
          <MyBookingsPage
            onSelectBooking={(id) => {
              setSelectedBookingId(id);
              setCurrentView("booking-details");
            }}
            onNavigateToEvents={() => setCurrentView("events")}
          />
        )}

        {currentView === "booking-details" && (
          <BookingDetailsPage
            bookingId={selectedBookingId}
            onNavigateBack={() => {
              if (activeRole === "customer") setCurrentView("bookings");
              else if (activeRole === "vendor") setCurrentView("vendor-requests");
              else setCurrentView("admin-bookings");
            }}
            onPaymentSuccess={(bkg) => {
              setConfirmedBooking(bkg);
              setCurrentView("booking-confirmation");
            }}
          />
        )}

        {currentView === "booking-confirmation" && (
          <BookingConfirmationPage
            booking={confirmedBooking}
            onNavigateToBookings={() => setCurrentView("bookings")}
            onNavigateToEvents={() => setCurrentView("events")}
          />
        )}

        {/* VENDOR OPERATING PORTAL & INQUIRIES */}
        {currentView === "vendor-portal" && (
          <VendorDashboard
            onSwitchToMarketplace={() => setCurrentView("marketplace")}
          />
        )}

        {currentView === "vendor-requests" && (
          <VendorRequestsPage
            onSelectRequest={(id) => {
              setSelectedBookingId(id);
              setCurrentView("vendor-request-details");
            }}
          />
        )}

        {currentView === "vendor-request-details" && (
          <VendorRequestDetailsPage
            bookingId={selectedBookingId}
            onNavigateBack={() => setCurrentView("vendor-requests")}
          />
        )}

        {/* ADMIN VIEWS */}
        {currentView === "admin-bookings" && (
          <AdminBookingsPage
            onSelectBooking={(id) => {
              setSelectedBookingId(id);
              setCurrentView("admin-booking-details");
            }}
          />
        )}

        {currentView === "admin-booking-details" && (
          <AdminBookingDetailsPage
            bookingId={selectedBookingId}
            onNavigateBack={() => setCurrentView("admin-bookings")}
          />
        )}

        {/* DISCOVER VENDORS VIEW */}
        {currentView === "discover" && (
          <VendorDiscovery
            onSelectVendor={(v) => handleBookNow(v)}
            onOpenVendorPortal={() => setCurrentView("vendor-portal")}
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
            setCurrentView("create-event");
          }}
          onSuccess={(bkg) => {
            setIsBookModalOpen(false);
            setSelectedBookingId(bkg.id);
            setCurrentView("booking-details");
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
