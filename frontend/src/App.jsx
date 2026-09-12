import { useState } from "react";
import "./App.css";
import { VendorDiscovery, VendorDashboard } from "./features/vendor";

export default function App() {
  const [currentView, setCurrentView] = useState("home");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const events = [
    {
      id: 1,
      title: "Grand Wedding Celebration",
      type: "Wedding",
      date: "Dec 05, 2026",
      location: "Ahmedabad",
      guests: "150 guests",
      price: "₹1,20,000",
      description: "A premium venue package for large celebrations.",
    },
    {
      id: 2,
      title: "Startup Launch Night",
      type: "Corporate",
      date: "Jan 18, 2027",
      location: "Gandhinagar",
      guests: "85 guests",
      price: "₹95,000",
      description: "A polished event setup for launches and networking.",
    },
  ];

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand-wrap cursor-pointer" onClick={() => setCurrentView("home")}>
          <div className="brand-mark">B</div>

          <div>
            <p className="brand-name">BookMe</p>
            <span className="brand-subtitle">Event Operating Platform</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <button
            type="button"
            className={currentView === "discover" ? "active" : ""}
            onClick={() => setCurrentView("discover")}
          >
            Discover
          </button>

          <button
            type="button"
            className={currentView === "events" ? "active" : ""}
            onClick={() => setCurrentView("home")}
          >
            Events
          </button>

          <button
            type="button"
            className={currentView === "vendors" ? "active" : ""}
            onClick={() => setCurrentView("vendors")}
          >
            Vendors
          </button>

          <button
            type="button"
            className={currentView === "vendor-portal" ? "active" : ""}
            onClick={() => setCurrentView("vendor-portal")}
          >
            Vendor Portal
          </button>
        </nav>

        <div className="topbar-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={() => setCurrentView("vendor-portal")}
          >
            Vendor Login
          </button>

          <button
            className="primary-button"
            type="button"
            onClick={() => setCurrentView("vendors")}
          >
            Find Vendors ⚡
          </button>
        </div>
      </header>

      <main className="content-area">

        {currentView === "home" && (
          <section className="discover-header">
            <div>
              <p className="eyebrow">AI-Powered Event Platform</p>

              <h1>
                Plan events with effortless
                <br />
                booking & vendor workflows.
              </h1>

              <p>
                Browse verified caterers, photographers, decorators, and DJs with real-time availability and dynamic package builders.
              </p>

              <div className="flex gap-3 mt-4">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setCurrentView("vendors")}
                >
                  Explore Vendors
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setCurrentView("vendor-portal")}
                >
                  Vendor Portal
                </button>
              </div>
            </div>
          </section>
        )}

        {currentView === "discover" && (
          <>
            <section className="discover-header">
              <div>
                <p className="eyebrow">Discover</p>

                <h1>Find the perfect event experience</h1>
              </div>

              <button
                className="primary-button"
                type="button"
                onClick={() => setCurrentView("home")}
              >
                Back home
              </button>
            </section>

            <section className="event-grid">
              {events.map((event) => (
                <article key={event.id} className="event-card">

                  <div className="event-image">
                    <span className="event-tag">
                      {event.type}
                    </span>
                  </div>

                  <div className="event-body">

                    <div className="event-meta-top">
                      <span>{event.date}</span>
                      <span>{event.location}</span>
                    </div>

                    <h3>{event.title}</h3>

                    <p>{event.description}</p>

                    <div className="event-meta-bottom">
                      <span>{event.guests}</span>
                      <strong>{event.price}</strong>
                    </div>

                    <button
                      className="secondary-button full-width"
                      type="button"
                      onClick={() => {
                        setSelectedEvent(event);
                        setCurrentView("booking");
                      }}
                    >
                      Book now
                    </button>

                  </div>
                </article>
              ))}
            </section>
          </>
        )}

        {/* Vendors Marketplace Discovery View */}
        {currentView === "vendors" && (
          <VendorDiscovery
            onSelectVendor={(v) => {
              setSelectedVendor(v);
              setCurrentView("vendor-portal");
            }}
            onOpenVendorPortal={() => setCurrentView("vendor-portal")}
          />
        )}

        {/* Vendor Management Dashboard & Operating Portal */}
        {currentView === "vendor-portal" && (
          <VendorDashboard
            onSwitchToMarketplace={() => setCurrentView("vendors")}
          />
        )}

      </main>
    </div>
  );
}