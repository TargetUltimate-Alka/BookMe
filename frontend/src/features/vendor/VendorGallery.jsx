import { useState } from "react";

export default function VendorGallery() {
  const [photos, setPhotos] = useState([
    {
      id: 1,
      title: "Royal Wedding Buffet",
      tag: "Catering Setup",
      isCover: true,
      url: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 2,
      title: "Floral Stage Ambience",
      tag: "Stage & Decor",
      isCover: false,
      url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 3,
      title: "Artisanal Mocktails Bar",
      tag: "Beverage Counter",
      isCover: false,
      url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 4,
      title: "Live Tandoor & Grill",
      tag: "Live Counter",
      isCover: false,
      url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 5,
      title: "Gourmet Desserts Counter",
      tag: "Desserts",
      isCover: false,
      url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 6,
      title: "VIP Round Table Banquet",
      tag: "Seating Setup",
      isCover: false,
      url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80",
    },
  ]);

  const [notification, setNotification] = useState("");

  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files.length) return;

    const newItems = Array.from(files).map((file, idx) => ({
      id: Date.now() + idx,
      title: file.name.replace(/\.[^/.]+$/, ""),
      tag: "New Upload",
      isCover: false,
      url: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...newItems, ...prev]);
    setNotification(`${files.length} Photo(s) uploaded successfully!`);
    setTimeout(() => setNotification(""), 3000);
  };

  const setCover = (id) => {
    setPhotos((prev) =>
      prev.map((p) => ({ ...p, isCover: p.id === id }))
    );
    setNotification("Cover photo updated!");
    setTimeout(() => setNotification(""), 3000);
  };

  const deletePhoto = (id) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setNotification("Photo removed from gallery.");
    setTimeout(() => setNotification(""), 3000);
  };

  return (
    <div className="vendor-section-card">
      <div className="vendor-section-header">
        <div>
          <h3>📸 Portfolio & Media Gallery</h3>
          <p>Showcase your previous events, setups, and food counters.</p>
        </div>
        <label className="primary-button cursor-pointer">
          + Upload Photos
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {notification && (
        <div className="notification-toast">✓ {notification}</div>
      )}

      <div className="gallery-grid">
        {photos.map((photo) => (
          <div key={photo.id} className="gallery-card">
            <img src={photo.url} alt={photo.title} />
            {photo.isCover && (
              <span className="cover-badge">★ COVER PHOTO</span>
            )}
            <div className="gallery-overlay">
              <div>
                <p className="photo-title">{photo.title}</p>
                <span className="photo-tag">{photo.tag}</span>
              </div>
              <div className="photo-actions">
                {!photo.isCover && (
                  <button
                    type="button"
                    onClick={() => setCover(photo.id)}
                    className="action-btn-cover"
                  >
                    Make Cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deletePhoto(photo.id)}
                  className="action-btn-del"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
