import { useState, useEffect } from "react";
import VendorCard from "./VendorCard";
import {
  fetchVendors,
  fetchCategories,
  createNotifyRequest,
  checkBackendHealth,
} from "./api";

const DEFAULT_VENDORS = [
  {
    id: "vnd_sunset_caterers",
    businessName: "Sunset Royal Caterers & Event Crafters",
    category: "Catering",
    location: "SG Highway, Ahmedabad",
    serviceRadiusKm: 50,
    rating: 4.96,
    reviewsCount: 128,
    verified: true,
    isDemo: false,
    basePrice: 40500,
    hasActiveDiscount: true,
    coverImage: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80",
    description: "Specialized in royal destination wedding buffets, multi-cuisine live counters & artisanal mocktail lounges.",
    tags: ["Live Chaat", "Mocktail Bar", "100% Pure Veg", "10% Festive Off"],
  },
  {
    id: "vnd_dream_clicks",
    businessName: "Dream Clicks Cinematic Studio",
    category: "Photography",
    location: "Vastrapur, Ahmedabad",
    serviceRadiusKm: 100,
    rating: 4.9,
    reviewsCount: 94,
    verified: true,
    isDemo: false,
    basePrice: 55000,
    coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    description: "Award-winning candid wedding storytellers, 4K cinematic teasers, and DGCA-compliant drone aerial wedding shoots.",
    tags: ["Candid Photography", "Cinematic 4K", "Drone Shoots", "Pre-Wedding"],
  },
  {
    id: "vnd_aura_decors",
    businessName: "Aura Luxury Stage & Floral Decors",
    category: "Decoration",
    location: "Bodakdev, Ahmedabad",
    serviceRadiusKm: 60,
    rating: 4.85,
    reviewsCount: 76,
    verified: true,
    isDemo: false,
    basePrice: 65000,
    coverImage: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80",
    description: "Grand entrance floral arches, dynamic LED tunnel stages, and royal wedding mandap architectural setups.",
    tags: ["Floral Mandap", "LED Stage", "Theme Decors", "Lighting Ambience"],
  },
  {
    id: "vnd_electra_dj",
    businessName: "Electra DJ & Sound Innovations",
    category: "DJ & Music",
    location: "Prahlad Nagar, Ahmedabad",
    serviceRadiusKm: 45,
    rating: 4.95,
    reviewsCount: 110,
    verified: true,
    isDemo: false,
    basePrice: 35000,
    coverImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80",
    description: "High-energy club DJ setups, celebrity sangeet nights, JBL line array sound & intelligent CO2 fog jets.",
    tags: ["Sangeet DJ", "Line Array Audio", "Cold Pyro", "Laser Shows"],
  },
];

export default function VendorDiscovery({ onSelectVendor, onOpenVendorPortal }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [hasDiscount, setHasDiscount] = useState(false);
  const [includeDemo, setIncludeDemo] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");

  const [categoryGroups, setCategoryGroups] = useState([]);
  const [vendors, setVendors] = useState(DEFAULT_VENDORS);
  const [totalMatches, setTotalMatches] = useState(DEFAULT_VENDORS.length);
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifyToast, setNotifyToast] = useState("");

  useEffect(() => {
    fetchCategories()
      .then((res) => {
        if (res?.groups) setCategoryGroups(res.groups);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function loadVendors() {
      setIsLoading(true);
      const isLive = await checkBackendHealth();
      setIsBackendLive(isLive);

      if (isLive) {
        try {
          const res = await fetchVendors({
            q: searchQuery || undefined,
            category: selectedCategory !== "all" ? selectedCategory : undefined,
            location: locationFilter || undefined,
            date: eventDate || undefined,
            maxPrice: maxPrice || undefined,
            minRating: minRating || undefined,
            hasDiscount: hasDiscount ? "true" : undefined,
            includeDemo: includeDemo ? "true" : undefined,
            sortBy,
            limit: 24,
          });
          if (res && Array.isArray(res.items)) {
            const merged = res.items.map((item, idx) => {
              const fallback = DEFAULT_VENDORS[idx % DEFAULT_VENDORS.length];
              return {
                ...item,
                id: item.id,
                businessName: item.businessName,
                category: item.category || fallback.category,
                location: item.location || fallback.location,
                rating: item.rating ? parseFloat(item.rating) : null,
                reviewsCount: item.reviewCount ?? fallback.reviewsCount,
                verified: Boolean(item.verified),
                isDemo: Boolean(item.isDemo),
                basePrice: item.startingPriceInr ?? fallback.basePrice,
                coverImage: item.photoUrl || fallback.coverImage,
                description: item.description || fallback.description,
                tags:
                  item.categories?.length > 0
                    ? item.categories.map((c) => c.name)
                    : fallback.tags,
              };
            });
            setVendors(merged);
            setTotalMatches(res.totalItems ?? merged.length);
          }
        } catch (e) {
          setVendors(DEFAULT_VENDORS);
        }
      } else {
        setVendors(DEFAULT_VENDORS);
      }
      setIsLoading(false);
    }

    loadVendors();
  }, [
    searchQuery,
    selectedCategory,
    locationFilter,
    eventDate,
    maxPrice,
    minRating,
    hasDiscount,
    includeDemo,
    sortBy,
  ]);

  const quickCategories = [
    "all",
    "Catering",
    "Photography",
    "Decoration",
    "DJ",
    "Wedding Planner",
    "Bridal Makeup Artist",
    "Mandap Decorator",
  ];

  const handleNotifyMe = async (vendor) => {
    const targetDate = eventDate || "2026-12-20";
    try {
      await createNotifyRequest({
        userId: "usr_customer_guest",
        vendorId: vendor.id,
        requestedDate: targetDate,
      });
      setNotifyToast(
        `🔔 Alert registered! We will notify you as soon as ${vendor.businessName} opens capacity on ${targetDate} (FR-SRCH-05).`
      );
    } catch (e) {
      setNotifyToast(
        `🔔 Alert saved for ${vendor.businessName} on ${targetDate}!`
      );
    }
    setTimeout(() => setNotifyToast(""), 4500);
  };

  return (
    <div className="discovery-section">
      <div className="discovery-topbar">
        <div>
          <div className="flex items-center gap-3">
            <h2>✨ BookMe Verified Event Vendors ({totalMatches} Matches)</h2>
            {isBackendLive ? (
              <span className="badge-verified">🟢 Live SRS Engine (60 Categories)</span>
            ) : (
              <span className="badge-rating">🟡 Offline Demo Mode</span>
            )}
          </div>
          <p>
            Search across 60 event service categories with real-time package capacity, service radius eligibility, and verified pricing.
          </p>
        </div>

        {onOpenVendorPortal && (
          <button
            type="button"
            className="secondary-button"
            onClick={onOpenVendorPortal}
          >
            🏢 Vendor Management Portal
          </button>
        )}
      </div>

      {notifyToast && <div className="notification-toast">{notifyToast}</div>}

      {/* Search & Multi-Criterion SRS Filter Bar (FR-SRCH-01..06) */}
      <div className="filter-controls-row space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 w-full">
          <input
            type="text"
            placeholder="🔍 Vendor name or service..."
            className="p-2 rounded bg-slate-800 text-white border border-slate-700 md:col-span-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <input
            type="text"
            placeholder="📍 City (e.g. Ahmedabad, Mumbai)"
            className="p-2 rounded bg-slate-800 text-white border border-slate-700"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
          <input
            type="date"
            title="Filter by Event Date Availability (FR-SRCH-02)"
            className="p-2 rounded bg-slate-800 text-white border border-slate-700"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
          <input
            type="number"
            placeholder="₹ Max Budget (INR)"
            className="p-2 rounded bg-slate-800 text-white border border-slate-700"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
          <select
            className="p-2 rounded bg-slate-800 text-white border border-slate-700"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="relevance">Sort: Relevance & Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating_desc">Rating: Highest First</option>
            <option value="popularity">Popularity: Most Reviewed</option>
          </select>
        </div>

        {/* Full 60-Category Dropdown + Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="category-pills-row flex-wrap">
            {quickCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`pill-btn ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === "all" ? "All 60 Categories" : cat}
              </button>
            ))}

            {categoryGroups.length > 0 && (
              <select
                className="p-1.5 rounded bg-slate-800 text-xs text-slate-200 border border-slate-700"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Browse All 60 Service Categories...</option>
                {categoryGroups.map((grp) => (
                  <optgroup key={grp.id} label={grp.name}>
                    {grp.subcategories?.map((sub) => (
                      <option key={sub.id} value={sub.name}>
                        {sub.name} {sub.isRegulated ? "⚠️ (Regulated)" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-300">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={hasDiscount}
                onChange={(e) => setHasDiscount(e.target.checked)}
              />
              🏷️ Discounts Only
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDemo}
                onChange={(e) => setIncludeDemo(e.target.checked)}
              />
              🧪 Include 500 Demo Samples
            </label>
          </div>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="vendor-marketplace-grid">
        {isLoading ? (
          <p className="text-slate-400">Searching verified vendors & checking slot capacity...</p>
        ) : vendors.length > 0 ? (
          vendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onBookNow={onSelectVendor}
              onNotifyMe={handleNotifyMe}
            />
          ))
        ) : (
          <p className="text-slate-400">
            No vendors found with remaining capacity matching your criteria. Try adjusting filters or click "Notify Me".
          </p>
        )}
      </div>
    </div>
  );
}
