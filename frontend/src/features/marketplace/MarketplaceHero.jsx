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

const HERO_SHOWCASE_PHOTOS = [
  {
    id: "catering",
    title: "Royal Mewari Banquet Feast",
    category: "Catering & Cooks",
    tagline: "Live chaat counters, signature Dal Baati & international buffet",
    price: "₹38,500",
    rating: "4.98",
    reviews: 142,
    badge: "15% Festive Off",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1000&q=80",
    location: "Udaipur & Pan-India",
  },
  {
    id: "photography",
    title: "Lake Palace Candid Cinema",
    category: "Photography & Cinema",
    tagline: "4K cinematic drone shoots & candid bridal storytelling",
    price: "₹49,500",
    rating: "4.97",
    reviews: 165,
    badge: "20% Early Bird",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80",
    location: "Udaipur & Destination",
  },
  {
    id: "decor",
    title: "Grand Royal Floral Mandap",
    category: "Decoration & Stages",
    tagline: "Fresh rose & marigold mandaps with fairy light canopies",
    price: "₹58,000",
    rating: "4.95",
    reviews: 135,
    badge: "18% Festive Off",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80",
    location: "Rajasthan & Gujarat",
  },
  {
    id: "dj",
    title: "Concert Audio & Sangeet DJ",
    category: "DJ & Music",
    tagline: "JBL line arrays, intelligent moving heads & cold spark pyro",
    price: "₹32,000",
    rating: "4.96",
    reviews: 118,
    badge: "15% Off Sangeet",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80",
    location: "Pan-India Availability",
  },
];

export function MarketplaceHero({
  searchQuery = "",
  onSearchChange,
  onKeywordSearchSubmit,
  selectedLocation = "all",
  onLocationChange,
  onSearchSubmit,
}) {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showPlannerForm, setShowPlannerForm] = useState(false);

  // Planner state
  const [eventType, setEventType] = useState("wedding");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("100-300");

  const currentPhoto = HERO_SHOWCASE_PHOTOS[activePhotoIndex];

  // Submit keyword search from hero
  const handleHeroSearchSubmit = (e) => {
    e.preventDefault();
    if (onKeywordSearchSubmit) {
      onKeywordSearchSubmit(localQuery);
    } else if (onSearchChange) {
      onSearchChange(localQuery);
    }
  };

  // Submit fast planner form
  const handlePlannerSubmit = (e) => {
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
    <section className="marketplace-hero" aria-label="BookMe Marketplace Hero">
      <div className="marketplace-hero-inner">
        {/* Left Hero Content: Headline, Bullet Proofs & Prominent Search */}
        <div className="marketplace-hero-content">
          <div className="hero-trust-badge">
            <span className="hero-trust-pulse"></span>
            <span>⭐ India&apos;s Leading Verified Event Marketplace</span>
          </div>

          <h1 className="hero-main-title">
            Make Every Celebration{" "}
            <span className="hero-coral-accent">Unforgettable</span>
          </h1>

          <p className="hero-main-subtitle">
            Book royal caterers, luxury decorators, candid cinematographers, and top DJs with transparent package pricing and 100% escrow protection.
          </p>

          {/* CaterDirectly-style Value Proposition Bullets */}
          <ul className="hero-value-bullets" role="list">
            <li className="hero-bullet-item">
              <span className="hero-check-icon" aria-hidden="true">✓</span>
              <div>
                <strong>Book everything in one place</strong>
                <span>Catering, photo, decor & DJ in a single coordinated cart</span>
              </div>
            </li>
            <li className="hero-bullet-item">
              <span className="hero-check-icon" aria-hidden="true">✓</span>
              <div>
                <strong>Top-rated & KYC verified vendors only</strong>
                <span>Hand-vetted professionals with 4.8+ ratings and genuine client reviews</span>
              </div>
            </li>
            <li className="hero-bullet-item">
              <span className="hero-check-icon" aria-hidden="true">✓</span>
              <div>
                <strong>40% Escrow deposit protection</strong>
                <span>Your funds are safely held until event milestones are confirmed</span>
              </div>
            </li>
          </ul>

          {/* Prominent Hero Search Bar */}
          <form className="hero-prominent-search-form" onSubmit={handleHeroSearchSubmit}>
            <div className="hero-search-input-group">
              <span className="hero-search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="hero-search-input"
                placeholder="Search royal caterers, wedding photographers, DJs, floral decors..."
                value={localQuery}
                onChange={(e) => {
                  setLocalQuery(e.target.value);
                  if (onSearchChange) onSearchChange(e.target.value);
                }}
                aria-label="Search event services and vendors"
              />
            </div>

            <div className="hero-search-city-group">
              <span className="hero-city-icon" aria-hidden="true">📍</span>
              <select
                className="hero-search-city-select"
                value={selectedLocation}
                onChange={(e) => onLocationChange && onLocationChange(e.target.value)}
                aria-label="Select city"
              >
                {INDIAN_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="hero-search-cta-btn">
              <span>Find Available Vendors</span>
              <span className="hero-btn-arrow">➜</span>
            </button>
          </form>

          {/* Trust Social Proof Row */}
          <div className="hero-social-proof-row">
            <div className="hero-stars-wrap">
              <span className="hero-gold-stars">★★★★★</span>
              <span className="hero-rating-score">4.9/5</span>
              <span className="hero-rating-meta">from 420+ events</span>
            </div>
            <span className="hero-proof-divider">•</span>
            <div className="hero-proof-location">
              <span>📍 Udaipur • Jaipur • Ahmedabad • Mumbai • Delhi NCR</span>
            </div>
          </div>
        </div>

        {/* Right Hero Visual Showcase: Real Catering/Event Photo & Fast Planner Card */}
        <div className="hero-showcase-container">
          <div className="hero-image-card">
            {/* Main Visual Image */}
            <div className="hero-photo-wrapper">
              <img
                src={currentPhoto.image}
                alt={currentPhoto.title}
                className="hero-main-photo"
                loading="eager"
              />
              <div className="hero-photo-overlay" />

              {/* Top Floater Badge */}
              <div className="hero-floating-badge top">
                <span className="hero-badge-pill discount">{currentPhoto.badge}</span>
                <span className="hero-badge-pill verified">🛡️ KYC Verified</span>
              </div>

              {/* Bottom Glassmorphic Showcase Info */}
              <div className="hero-floating-card bottom">
                <div className="hero-card-meta-row">
                  <span className="hero-card-category">{currentPhoto.category}</span>
                  <div className="hero-card-rating">
                    <span className="star">★</span>
                    <strong>{currentPhoto.rating}</strong>
                    <span className="count">({currentPhoto.reviews} reviews)</span>
                  </div>
                </div>

                <h3 className="hero-card-title">{currentPhoto.title}</h3>
                <p className="hero-card-tagline">{currentPhoto.tagline}</p>

                <div className="hero-card-footer-row">
                  <div>
                    <span className="hero-price-label">Starting package</span>
                    <span className="hero-price-val">{currentPhoto.price}</span>
                  </div>
                  <span className="hero-location-tag">📍 {currentPhoto.location}</span>
                </div>
              </div>
            </div>

            {/* Thumbnail Navigation Switcher */}
            <div className="hero-thumbnails-row">
              {HERO_SHOWCASE_PHOTOS.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className={`hero-thumb-btn ${activePhotoIndex === idx ? "active" : ""}`}
                  onClick={() => setActivePhotoIndex(idx)}
                  title={`View ${item.category}`}
                  aria-label={`View ${item.category} image`}
                >
                  <span className="hero-thumb-dot" />
                  <span className="hero-thumb-label">{item.category.split("&")[0].trim()}</span>
                </button>
              ))}
            </div>

            {/* Optional Fast Celebration Planner Trigger */}
            <div className="hero-planner-toggle-strip">
              <button
                type="button"
                className="hero-planner-toggle-btn"
                onClick={() => setShowPlannerForm((prev) => !prev)}
                aria-expanded={showPlannerForm}
              >
                <span>📅 Need Date & Guest Matching?</span>
                <span className="toggle-chevron">{showPlannerForm ? "▲ Hide" : "▼ Fast Match"}</span>
              </button>
            </div>

            {/* Collapsible Fast Planner Form */}
            {showPlannerForm && (
              <form className="hero-inline-planner-form" onSubmit={handlePlannerSubmit}>
                <div className="planner-fields-grid">
                  <div className="hero-field-group">
                    <label htmlFor="planner-event-type">Occasion</label>
                    <select
                      id="planner-event-type"
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

                  <div className="hero-field-group">
                    <label htmlFor="planner-event-date">Tentative Date</label>
                    <input
                      id="planner-event-date"
                      type="date"
                      value={eventDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                  </div>

                  <div className="hero-field-group">
                    <label htmlFor="planner-guest-count">Guests</label>
                    <select
                      id="planner-guest-count"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                    >
                      <option value="50-100">50 – 100</option>
                      <option value="100-300">100 – 300</option>
                      <option value="300-600">300 – 600</option>
                      <option value="600+">600+ Grand</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="hero-planner-submit-btn">
                  <span>Match Available Vendors</span>
                  <span>⚡</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
