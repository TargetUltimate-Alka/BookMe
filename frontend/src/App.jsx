import { useState, useEffect } from "react";
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
import {
  AuthProvider,
  useAuth,
  AuthPage,
  UserProfileModal,
} from "./features/auth/index.js";

function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [currentView, setCurrentView] = useState("events");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [vendorToBook, setVendorToBook] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Sync active view and client context whenever authenticated user changes
  useEffect(() => {
    if (user && user.id) {
      setAuthContext(user.id, user.role);
      if (user.role === "vendor") {
        setCurrentView("vendor-portal");
      } else if (user.role === "admin") {
        setCurrentView("admin-bookings");
      } else {
        setCurrentView("events");
      }
    }
  }, [user]);

  const handleBookNow = (catalogItem) => {
    setVendorToBook({
      vendorId: catalogItem.id || "vnd_sunset_caterers",
      vendorName: catalogItem.businessName || catalogItem.title,
      packageName: catalogItem.category ? `${catalogItem.category} Package` : "Standard Package",
      category: catalogItem.category || "Catering",
      price: catalogItem.basePrice || catalogItem.price || 45000,
    });
    setIsBookModalOpen(true);
  };

  // 1. Initial authentication loading state
  if (isLoading) {
    return (
      <div className="page-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="brand-mark" style={{ margin: "0 auto 1.5rem auto", width: 56, height: 56, fontSize: 24 }}>B</div>
          <p style={{ fontWeight: 600, color: "#4b5563" }}>Verifying BookMe session...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State: Show Authentication Portal
  if (!isAuthenticated) {
    return (
      <div className="page-shell">
        <header className="topbar">
          <div className="brand-wrap">
            <div className="brand-mark">B</div>
            <div>
              <p className="brand-name">BookMe</p>
              <span className="brand-subtitle">Event Operating Platform</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>
              🔒 Identity & Role Access
            </span>
          </div>
        </header>

        <main className="content-area">
          <AuthPage />
        </main>
      </div>
    );
  }

  const activeRole = user.role; // Real authenticated role ('customer' | 'vendor' | 'admin')

  // 3. Authenticated State: Full BookMe Application
  return (
    <div className="page-shell">
      <header className="topbar">
        <div
          className="brand-wrap cursor-pointer"
          onClick={() => {
            if (activeRole === "customer") setCurrentView("events");
            else if (activeRole === "vendor") setCurrentView("vendor-portal");
            else setCurrentView("admin-bookings");
          }}
        >
          <div className="brand-mark">B</div>
          <div>
            <p className="brand-name">BookMe</p>
            <span className="brand-subtitle">Event Operating Platform</span>
          </div>
        </div>

        {/* Dynamic Navigation Tabs strictly based on authenticated role */}
        <nav className="main-nav" aria-label="Main navigation">
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
                Find Vendors ⚡
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
            <>
              <button
                type="button"
                className={currentView === "admin-bookings" ? "active" : ""}
                onClick={() => setCurrentView("admin-bookings")}
              >
                Platform Oversight
              </button>
            </>
          )}
        </nav>

        {/* Topbar User Profile & Actions */}
        <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* User Profile Badge */}
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
              transition: "all 0.15s ease",
            }}
            title="Click to view or edit profile"
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: activeRole === "vendor" ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "linear-gradient(135deg, #4f46e5, #6366f1)",
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
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1e293b", maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.name}
              </div>
              <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "#64748b", textTransform: "capitalize" }}>
                {activeRole === "vendor" ? "🏢 Vendor" : "👤 Customer"}
              </div>
            </div>
          </div>

          {activeRole === "customer" && (
            <button
              className="primary-button"
              type="button"
              onClick={() => setCurrentView("create-event")}
            >
              + Create event
            </button>
          )}

          {activeRole === "vendor" && (
            <button
              className="primary-button"
              type="button"
              onClick={() => setCurrentView("discover")}
            >
              Marketplace Preview
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
            onFindVendors={() => setCurrentView("discover")}
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
            onSwitchToMarketplace={() => setCurrentView("discover")}
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

        {/* DISCOVER VENDORS VIEW (Powered by VendorDiscovery) */}
        {currentView === "discover" && (
          <VendorDiscovery
            onSelectVendor={(v) => handleBookNow(v)}
            onOpenVendorPortal={() => {
              setCurrentView("vendor-portal");
            }}
          />
        )}
      </main>

      {/* Book Vendor Modal from catalog */}
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
            alert(`Booking successfully requested! ID: ${bkg.id}`);
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
