export function WishlistModal({
  isOpen,
  onClose,
  wishlistVendors = [],
  onRemoveFromWishlist,
  onBookNow,
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wishlist-title"
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.25rem" }}>❤️</span>
            <h3 id="wishlist-title" style={{ margin: 0, fontSize: "1.2rem", fontWeight: 750, color: "#0f172a" }}>
              Saved Vendors ({wishlistVendors.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {wishlistVendors.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🤍</div>
              <h4 style={{ margin: "0 0 6px 0", color: "#1e293b", fontSize: "1.1rem" }}>
                Your Wishlist is Empty
              </h4>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
                Tap the heart icon on any vendor card to save options while comparing packages!
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {wishlistVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    background: "#f8fafc",
                    gap: 14,
                  }}
                >
                  <img
                    src={vendor.coverImage || vendor.photoUrl || "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80"}
                    alt={vendor.businessName}
                    style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover" }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                      {vendor.businessName}
                    </h4>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                      📍 {vendor.location} &bull; {vendor.category}
                    </p>
                    <strong style={{ fontSize: "0.9rem", color: "#4f46e5" }}>
                      ₹{Number(vendor.basePrice || 45000).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onBookNow(vendor);
                      }}
                      className="marketplace-header-btn primary"
                      style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                    >
                      Book ⚡
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveFromWishlist(vendor.id)}
                      style={{
                        background: "#fee2e2",
                        border: "none",
                        color: "#ef4444",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                      title="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
