import { useState } from "react";
import "./App.css";

export default function App() {
  const [currentView, setCurrentView] = useState("home");
  const [selectedEvent, setSelectedEvent] = useState(null);

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
        <div className="brand-wrap">
          <div className="brand-mark">B</div>

          <div>
            <p className="brand-name">BookMe</p>
            <span className="brand-subtitle">Event Booking</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <button
            type="button"
            onClick={() => setCurrentView("discover")}
          >
            Discover
          </button>

          <button type="button">Events</button>

          <button type="button">Bookings</button>

          <button type="button">Vendors</button>
        </nav>

        <div className="topbar-actions">
          <button className="ghost-button" type="button">
            Sign in
          </button>

          <button className="primary-button" type="button">
            Create event
          </button>
        </div>
      </header>

      <main className="content-area">

        {currentView === "home" && (
          <section className="discover-header">
            <div>
              <p className="eyebrow">Book memorable experiences</p>

              <h1>
                Plan events with effortless
                <br />
                booking workflows.
              </h1>

              <p>
                Event organizers can browse services, compare vendors,
                and manage bookings in one place.
              </p>

              <button
                className="primary-button"
                type="button"
                onClick={() => setCurrentView("discover")}
              >
                Explore events
              </button>
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

      </main>
    </div>
  );
}