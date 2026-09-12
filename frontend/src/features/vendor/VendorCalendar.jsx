import { useState } from "react";

export default function VendorCalendar() {
  const [calendarDates, setCalendarDates] = useState([
    { day: 1, status: "available" },
    { day: 2, status: "available" },
    { day: 3, status: "available" },
    { day: 4, status: "booked", note: "💍 Wedding Reception" },
    { day: 5, status: "blocked", note: "🚫 Day Off" },
    { day: 6, status: "available" },
    { day: 7, status: "available" },
    { day: 8, status: "available" },
    { day: 9, status: "available" },
    { day: 10, status: "available" },
    { day: 11, status: "available" },
    { day: 12, status: "booked", note: "💍 Sangeet Night" },
    { day: 13, status: "available" },
    { day: 14, status: "available" },
  ]);

  const [notification, setNotification] = useState("");

  const toggleStatus = (day) => {
    setCalendarDates((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d;
        if (d.status === "available") {
          return { ...d, status: "blocked", note: "🚫 Blocked" };
        } else if (d.status === "blocked") {
          return { ...d, status: "available", note: null };
        }
        return d;
      })
    );
    setNotification(`Day ${day} status updated!`);
    setTimeout(() => setNotification(""), 3000);
  };

  return (
    <div className="vendor-section-card">
      <div className="vendor-section-header">
        <div>
          <h3>🗓️ Availability Calendar & Slot Manager</h3>
          <p>Click any date to toggle between Available and Blocked.</p>
        </div>
        <div className="legend-row">
          <span className="legend-item"><span className="dot green"></span> Available</span>
          <span className="legend-item"><span className="dot red"></span> Blocked</span>
          <span className="legend-item"><span className="dot purple"></span> BookMe Confirmed</span>
        </div>
      </div>

      {notification && (
        <div className="notification-toast">✓ {notification}</div>
      )}

      <div className="calendar-grid">
        {calendarDates.map((d) => (
          <button
            key={d.day}
            type="button"
            className={`calendar-date-btn ${d.status}`}
            onClick={() => toggleStatus(d.day)}
          >
            <span className="date-number">{d.day}</span>
            {d.note && <span className="date-note">{d.note}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
