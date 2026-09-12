import { useState } from "react";
import VendorGallery from "./VendorGallery";
import VendorPackages from "./VendorPackages";
import VendorCalendar from "./VendorCalendar";

export default function VendorDashboard({ onSwitchToMarketplace }) {
  const [activeTab, setActiveTab] = useState("overview");

  const [bookingRequests, setBookingRequests] = useState([
    {
      id: 1,
      title: "Grand Wedding Reception (450 Guests)",
      client: "Kavya & Rohan Patel",
      package: "Gold Wedding Feast + Live Chaat",
      date: "Dec 18, 2026",
      location: "Karnavati Club, Ahmedabad",
      amount: "₹1,45,000",
      status: "pending",
    },
    {
      id: 2,
      title: "Corporate Leadership Summit (150 Pax)",
      client: "FinTech Hub India",
      package: "Executive High-Tea & Multi-Cuisine",
      date: "Nov 05, 2026",
      location: "GIFT City Tech Tower",
      amount: "₹85,000",
      status: "pending",
    },
  ]);

  const [notification, setNotification] = useState("");

  const handleBookingAction = (id, accepted) => {
    setBookingRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: accepted ? "accepted" : "declined" } : r
      )
    );
    setNotification(
      accepted
        ? "Booking accepted! Escrow locked and added to your calendar."
        : "Booking request declined."
    );
    setTimeout(() => setNotification(""), 3000);
  };

  return (
    <div className="vendor-portal-wrap">
      
      {/* Portal Top Bar */}
      <div className="vendor-portal-header">
        <div className="vendor-profile-info">
          <div className="vendor-avatar">SR</div>
          <div>
            <div className="vendor-title-row">
              <h2>Sunset Royal Caterers & Events</h2>
              <span className="badge-verified">✓ Verified Pro</span>
              <span className="badge-rating">★ 4.9 (42 reviews)</span>
            </div>
            <p className="vendor-subinfo">
              📍 SG Highway, Ahmedabad • 🍽️ Catering & Banquets • ⚡ AI Smart Matched
            </p>
          </div>
        </div>

        <div className="vendor-header-actions">
          <div className="payout-summary">
            <span className="payout-label">Estimated Payout</span>
            <span className="payout-val">₹3,40,000</span>
          </div>
          {onSwitchToMarketplace && (
            <button
              type="button"
              className="secondary-button"
              onClick={onSwitchToMarketplace}
            >
              👁️ View as Customer
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div className="notification-toast">✓ {notification}</div>
      )}

      {/* Navigation Tabs */}
      <div className="vendor-nav-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview & Requests
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "gallery" ? "active" : ""}`}
          onClick={() => setActiveTab("gallery")}
        >
          📸 Photos & Media
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "packages" ? "active" : ""}`}
          onClick={() => setActiveTab("packages")}
        >
          🍱 Custom Packages
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "calendar" ? "active" : ""}`}
          onClick={() => setActiveTab("calendar")}
        >
          🗓️ Availability Calendar
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content-body">
        {activeTab === "overview" && (
          <div className="space-y-6">
            
            {/* Stats Row */}
            <div className="metrics-row">
              <div className="metric-box">
                <span className="metric-title">Active Events</span>
                <p className="metric-num">12 Bookings</p>
                <span className="metric-sub text-green">↑ +3 this month</span>
              </div>
              <div className="metric-box">
                <span className="metric-title">Response Time</span>
                <p className="metric-num">12 mins</p>
                <span className="metric-sub">⚡ Super Fast Badge</span>
              </div>
              <div className="metric-box">
                <span className="metric-title">Profile Views</span>
                <p className="metric-num">2,850</p>
                <span className="metric-sub text-green">↑ +24% search boost</span>
              </div>
              <div className="metric-box">
                <span className="metric-title">Client Rating</span>
                <p className="metric-num">99.4%</p>
                <span className="metric-sub">★ 4.9 avg rating</span>
              </div>
            </div>

            {/* Inquiries List */}
            <div className="inquiries-card">
              <div className="inquiries-header">
                <h3>🔔 Live Customer Inquiries</h3>
                <span className="badge-count">
                  {bookingRequests.filter((r) => r.status === "pending").length} Pending
                </span>
              </div>

              <div className="inquiries-list">
                {bookingRequests.map((req) => (
                  <div key={req.id} className={`inquiry-row ${req.status}`}>
                    <div className="inquiry-main">
                      <h4>{req.title}</h4>
                      <p className="inquiry-client">
                        Client: <strong>{req.client}</strong> • Package: <em>{req.package}</em>
                      </p>
                      <p className="inquiry-meta">
                        📅 {req.date} • 📍 {req.location}
                      </p>
                    </div>

                    <div className="inquiry-actions">
                      <div className="inquiry-price">
                        <strong>{req.amount}</strong>
                        <span>100% Escrow</span>
                      </div>
                      {req.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => handleBookingAction(req.id, true)}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => handleBookingAction(req.id, false)}
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <span className={`status-tag ${req.status}`}>
                          {req.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === "gallery" && <VendorGallery />}
        {activeTab === "packages" && <VendorPackages />}
        {activeTab === "calendar" && <VendorCalendar />}
      </div>

    </div>
  );
}
