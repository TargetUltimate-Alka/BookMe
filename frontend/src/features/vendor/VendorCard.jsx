export default function VendorCard({ vendor, onBookNow }) {
  return (
    <article className="vendor-card">
      <div className="vendor-card-cover">
        <img src={vendor.coverImage} alt={vendor.businessName} />
        <div className="vendor-card-badges">
          <span className="badge-rating">★ {vendor.rating}</span>
          {vendor.verified && <span className="badge-verified">✓ Verified</span>}
        </div>
      </div>

      <div className="vendor-card-content">
        <div className="vendor-card-header">
          <h3>{vendor.businessName}</h3>
          <p className="vendor-location">📍 {vendor.location} • {vendor.category}</p>
        </div>

        <p className="vendor-desc">{vendor.description}</p>

        <div className="vendor-tags-row">
          {vendor.tags?.map((tag, idx) => (
            <span key={idx} className="vendor-tag-pill">{tag}</span>
          ))}
        </div>

        <div className="vendor-card-footer">
          <div>
            <span className="price-sub">Starting from</span>
            <strong className="price-main">₹{vendor.basePrice?.toLocaleString("en-IN")}</strong>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={() => onBookNow && onBookNow(vendor)}
          >
            Book Vendor ⚡
          </button>
        </div>
      </div>
    </article>
  );
}
