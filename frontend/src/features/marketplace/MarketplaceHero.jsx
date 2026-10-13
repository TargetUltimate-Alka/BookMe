import { useState } from "react";
import { INDIAN_LOCATIONS } from "./MarketplaceHeader";

export const EVENT_TYPES = [
  { id: "wedding", label: "💍 Wedding Celebration" },
  { id: "birthday", label: "🎂 Birthday & Anniversary" },
  { id: "corporate", label: "🏢 Corporate Event & Gala" },
  { id: "sangeet", label: "🪩 Sangeet, Haldi & Mehndi" },
  { id: "reception", label: "🥂 Grand Reception & Dinner" },
  { id: "festival", label: "🪔 Festive & Cultural Function" },
];

export function MarketplaceHero({
  onSearchSubmit,
  selectedLocation,
  onLocationChange,
}) {
  const [eventType, setEventType] = useState("wedding");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("100-300");

  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit({
        eventType,
        eventDate,
        guestCount,
        location: selectedLocation,
      });
    }
  };

  return (
    <section className="marketplace-hero" aria-label="Hero Overview">
      <div className="marketplace-hero-inner">
        {/* Left Hero Headline & Subtitle */}
        <div className="marketplace-hero-content">
          <h1>
            Make Every Celebration <span className="gradient-text">Extraordinary</span>
          </h1>
          <p className="subtitle">
            Discover trusted event professionals, compare packages, and plan your perfect celebration — all in one place.
          </p>

          <div className="marketplace-hero-badges">
            <div className="marketplace-hero-badge">
              <span>🛡️</span>
              <span>100% KYC Verified Vendors</span>
            </div>
            <div className="marketplace-hero-badge">
              <span>🔒</span>
              <span>40% Escrow Deposit Protection</span>
            </div>
            <div className="marketplace-hero-badge">
              <span>🏷️</span>
              <span>Transparent Package Pricing</span>
            </div>
            <div className="marketplace-hero-badge">
              <span>⚡</span>
              <span>Zero Off-Platform Commission</span>
            </div>
          </div>
        </div>

        {/* Right Event Celebration Planner Card */}
        <div className="hero-event-card">
          <div className="hero-event-card-header">
            <div>
              <h3>Plan Your Celebration</h3>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Instant vendor matching & capacity checks
              </span>
            </div>
            <span className="hero-event-tag">⚡ Fast Book</span>
          </div>

          <form className="hero-planner-form" onSubmit={handleQuickSearch}>
            {/* Event Type */}
            <div className="hero-field-group">
              <label htmlFor="hero-event-type">Occasion / Event Type</label>
              <select
                id="hero-event-type"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                {EVENT_TYPES.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="hero-form-row">
              {/* Event Date */}
              <div className="hero-field-group">
                <label htmlFor="hero-event-date">Tentative Date</label>
                <input
                  id="hero-event-date"
                  type="date"
                  value={eventDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              {/* Guest Count */}
              <div className="hero-field-group">
                <label htmlFor="hero-guest-count">Expected Guests</label>
                <select
                  id="hero-guest-count"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                >
                  <option value="50-100">50 – 100 Guests</option>
                  <option value="100-300">100 – 300 Guests</option>
                  <option value="300-600">300 – 600 Guests</option>
                  <option value="600+">600+ Grand Event</option>
                </select>
              </div>
            </div>

            {/* Event City */}
            <div className="hero-field-group">
              <label htmlFor="hero-location">Event City</label>
              <select
                id="hero-location"
                value={selectedLocation}
                onChange={(e) => onLocationChange(e.target.value)}
              >
                {INDIAN_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit CTA */}
            <button type="submit" className="hero-submit-btn">
              <span>Find Available Vendors</span>
              <span>⚡</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
