import { useState } from "react";
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

export default function App() {
  const [currentView, setCurrentView] = useState("events");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const [activeRole, setActiveRole] = useState("customer"); // 'customer' | 'vendor' | 'admin'

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [vendorToBook, setVendorToBook] = useState(null);

  const eventsCatalog = [
    {
      id: 1,
      title: "Grand Palace Banquet & Catering",
      type: "Venue & Catering",
      date: "Dec 05, 2026",
      location: "Ahmedabad",
      price: 120000,
      description: "Premier luxury venue package with fine dining catering included.",
    },
    {
      id: 2,
      title: "Prism Cinematic Photography",
      type: "Photography & Video",
      date: "Jan 18, 2027",
      location: "Gandhinagar",
      price: 75000,
      description: "High-end candid photography, 4K video teaser, and drone coverage.",
    },
  ];

  const handleRoleChange = (role) => {
    setActiveRole(role);
    if (role === "customer") {
      setAuthContext("usr_123", "customer");
      setCurrentView("events");
    } else if (role === "vendor") {
      setAuthContext("vnd_456", "vendor");
      setCurrentView("vendor-requests");
    } else if (role === "admin") {
      setAuthContext("admin_1", "admin");
      setCurrentView("admin-bookings");
    }
  };

  const handleBookNow = (catalogItem) => {
    setVendorToBook({
      vendorId: "vnd_456",
      vendorName: catalogItem.title,
      packageName: `${catalogItem.type} Package`,
      category: catalogItem.type,
      price: catalogItem.price,
    });
    setIsBookModalOpen(true);
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <div
          className="brand-wrap"
          style={{ cursor: "pointer" }}
          onClick={() => {
            if (activeRole === "customer") setCurrentView("events");
            else if (activeRole === "vendor") setCurrentView("vendor-requests");
            else setCurrentView("admin-bookings");
          }}
        >
          <div className="brand-mark">B</div>

          <div>
            <p className="brand-name">BookMe</p>
            <span className="brand-subtitle">Event Booking</span>
          </div>
        </div>

        {/* Dynamic Navigation Tabs based on Role */}
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
                Find Vendors
              </button>
            </>
          )}

          {activeRole === "vendor" && (
            <>
              <button
                type="button"
                className={currentView === "vendor-requests" ? "active" : ""}
                onClick={() => setCurrentView("vendor-requests")}
              >
                Booking Requests
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

        {/* Role Switcher & Action */}
        <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#f3f4f6",
              borderRadius: "8px",
              padding: "0.2rem",
              border: "1px solid #e5e7eb",
            }}
          >
            <button
              type="button"
              onClick={() => handleRoleChange("customer")}
              style={{
                background: activeRole === "customer" ? "#ffffff" : "transparent",
                color: activeRole === "customer" ? "#4f46e5" : "#6b7280",
                fontWeight: activeRole === "customer" ? 700 : 500,
                boxShadow: activeRole === "customer" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                borderRadius: "6px",
                padding: "0.3rem 0.6rem",
                fontSize: "0.75rem",
              }}
            >
              👤 Customer
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("vendor")}
              style={{
                background: activeRole === "vendor" ? "#ffffff" : "transparent",
                color: activeRole === "vendor" ? "#4f46e5" : "#6b7280",
                fontWeight: activeRole === "vendor" ? 700 : 500,
                boxShadow: activeRole === "vendor" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                borderRadius: "6px",
                padding: "0.3rem 0.6rem",
                fontSize: "0.75rem",
              }}
            >
              🏢 Vendor
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("admin")}
              style={{
                background: activeRole === "admin" ? "#ffffff" : "transparent",
                color: activeRole === "admin" ? "#4f46e5" : "#6b7280",
                fontWeight: activeRole === "admin" ? 700 : 500,
                boxShadow: activeRole === "admin" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                borderRadius: "6px",
                padding: "0.3rem 0.6rem",
                fontSize: "0.75rem",
              }}
            >
              🛡️ Admin
            </button>
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

        {/* VENDOR VIEWS */}
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
          <>
            <section className="discover-header">
              <div>
                <p className="eyebrow">Discover Verified Vendors</p>
                <h1>Find Top Event Services in Your City</h1>
              </div>

              <button
                className="primary-button"
                type="button"
                onClick={() => setCurrentView("events")}
              >
                Back to My Events
              </button>
            </section>

            <section className="event-grid">
              {eventsCatalog.map((item) => (
                <article key={item.id} className="event-card">
                  <div className="event-image">
                    <span className="event-tag">{item.type}</span>
                  </div>

                  <div className="event-body">
                    <div className="event-meta-top">
                      <span>{item.date}</span>
                      <span>{item.location}</span>
                    </div>

                    <h3>{item.title}</h3>
                    <p>{item.description}</p>

                    <div className="event-meta-bottom">
                      <span>Standard Package</span>
                      <strong>₹{item.price.toLocaleString("en-IN")}</strong>
                    </div>

                    <button
                      className="secondary-button full-width"
                      type="button"
                      onClick={() => handleBookNow(item)}
                    >
                      Book with this vendor
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </>
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
    </div>
  );
}