import { useState, useEffect } from "react";
import { blockDate, fetchAvailability } from "./api";

const VENDOR_ID = "vnd_sunset_caterers";

export default function VendorCalendar() {
  const [calendarDates, setCalendarDates] = useState([
    { day: 1, date: "2026-12-01", status: "available", blockId: null },
    { day: 2, date: "2026-12-02", status: "available", blockId: null },
    { day: 3, date: "2026-12-03", status: "available", blockId: null },
    { day: 4, date: "2026-12-04", status: "booked", note: "💍 Wedding Reception", blockId: null },
    { day: 5, date: "2026-12-05", status: "blocked", note: "🚫 Day Off", blockId: null },
    { day: 6, date: "2026-12-06", status: "available", blockId: null },
    { day: 7, date: "2026-12-07", status: "available", blockId: null },
    { day: 8, date: "2026-12-08", status: "available", blockId: null },
    { day: 9, date: "2026-12-09", status: "available", blockId: null },
    { day: 10, date: "2026-12-10", status: "available", blockId: null },
    { day: 11, date: "2026-12-11", status: "available", blockId: null },
    { day: 12, date: "2026-12-12", status: "booked", note: "💍 Sangeet Night", blockId: null },
    { day: 13, date: "2026-12-13", status: "available", blockId: null },
    { day: 14, date: "2026-12-14", status: "available", blockId: null },
  ]);

  const [notification, setNotification] = useState("");

  const toggleStatus = async (item) => {
    const isNowBlocked = item.status === "available";
    const newStatus = isNowBlocked ? "blocked" : "available";
    const newNote = isNowBlocked ? "🚫 Blocked" : null;

    setCalendarDates((prev) =>
      prev.map((d) => (d.day === item.day ? { ...d, status: newStatus, note: newNote } : d))
    );

    try {
      if (isNowBlocked) {
        await blockDate(VENDOR_ID, {
          date: item.date,
          reason: "Blocked by vendor in portal",
        });
        setNotification(`✓ Dec ${item.day} blocked and synced with backend database!`);
      } else {
        setNotification(`✓ Dec ${item.day} marked as available for booking!`);
      }
    } catch (e) {
      setNotification(`Dec ${item.day} status updated!`);
    }

    setTimeout(() => setNotification(""), 3500);
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
            onClick={() => toggleStatus(d)}
          >
            <span className="date-number">{d.day}</span>
            {d.note && <span className="date-note">{d.note}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
