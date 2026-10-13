export const SUPPORTED_CATEGORIES = [
  {
    id: "all",
    name: "All Services",
    icon: "🌟",
    tagline: "Explore complete catalog",
  },
  {
    id: "Photography",
    name: "Photography & Videography",
    icon: "📸",
    tagline: "Candid, Cinematic 4K & Drones",
    count: "240+ Studios",
  },
  {
    id: "Catering",
    name: "Catering & Cooks",
    icon: "🍲",
    tagline: "Royal Buffets & Live Food Counters",
    count: "180+ Caterers",
  },
  {
    id: "DJ & Music",
    name: "DJ & Music",
    icon: "🎧",
    tagline: "Sangeet DJs, Sound & Fog Pyro",
    count: "150+ Artists",
  },
  {
    id: "Decoration",
    name: "Decoration & Balloons",
    icon: "💐",
    tagline: "Floral Mandaps & Themed Stages",
    count: "210+ Decorators",
  },
  {
    id: "Makeup & Beauty",
    name: "Makeup & Beauty",
    icon: "💄",
    tagline: "Bridal HD, Airbrush & Hair Styling",
    count: "120+ Salons",
  },
  {
    id: "Mehndi Artists",
    name: "Mehndi Artists",
    icon: "✨",
    tagline: "Rajasthani, Arabic & Bridal Henna",
    count: "95+ Artists",
  },
  {
    id: "Lighting",
    name: "Lighting & Effects",
    icon: "💡",
    tagline: "Ambient LED, Truss & Intelligent Wash",
    count: "80+ Crews",
  },
  {
    id: "Tents & Event Setup",
    name: "Tents & Event Setup",
    icon: "⛺",
    tagline: "German Pagodas, AC Shamianas & Sofas",
    count: "70+ Setups",
  },
  {
    id: "Transportation",
    name: "Transportation & Luxury Cars",
    icon: "🚗",
    tagline: "Vintage Wedding Cars & Guest Coaches",
    count: "60+ Fleets",
  },
  {
    id: "Choreography",
    name: "Choreography & Emcee",
    icon: "💃",
    tagline: "Sangeet Trainers, Hosts & Live Bands",
    count: "50+ Hosts",
  },
];

export function MarketplaceCategories({ selectedCategory, onSelectCategory }) {
  return (
    <>
      {/* Horizontal Sticky Quick Bar */}
      <nav className="marketplace-categories-bar" aria-label="Quick Category Filter">
        <div className="marketplace-categories-bar-inner">
          {SUPPORTED_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-bar-pill ${
                selectedCategory === cat.id ? "active" : ""
              }`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Visual Category Cards Grid Section */}
      <section className="marketplace-section" aria-labelledby="cat-heading">
        <div className="marketplace-section-header">
          <div className="marketplace-section-title-wrap">
            <h2 id="cat-heading">Event Service Categories</h2>
            <p>Select a category to view verified professionals, transparent package pricing & availability</p>
          </div>
          {selectedCategory !== "all" && (
            <button
              type="button"
              className="marketplace-header-btn ghost"
              onClick={() => onSelectCategory("all")}
              style={{ fontSize: "0.8125rem", color: "#4f46e5" }}
            >
              Reset to All Categories ↺
            </button>
          )}
        </div>

        <div className="category-tiles-grid">
          {SUPPORTED_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <div
                key={cat.id}
                className={`category-tile ${isSelected ? "active" : ""}`}
                onClick={() => onSelectCategory(cat.id)}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
              >
                <div className="category-tile-icon">{cat.icon}</div>
                <div className="category-tile-name">{cat.name}</div>
                {cat.count && <div className="category-tile-count">{cat.count}</div>}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
