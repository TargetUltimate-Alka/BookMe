import { useState, useEffect } from "react";
import VendorCard from "./VendorCard";
import { fetchVendors, checkBackendHealth } from "./api";

const DEFAULT_VENDORS = [
  {
    id: "vnd_sunset_caterers",
    businessName: "Sunset Royal Caterers & Event Crafters",
    category: "Catering",
    location: "SG Highway, Ahmedabad",
    rating: 4.96,
    reviewsCount: 128,
    verified: true,
    basePrice: 45000,
    coverImage: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80",
    description: "Specialized in royal destination wedding buffets, multi-cuisine live counters & artisanal mocktail lounges.",
    tags: ["Live Chaat", "Mocktail Bar", "100% Pure Veg", "Destination Setup"],
  },
  {
    id: "vnd_dream_clicks",
    businessName: "Dream Clicks Cinematic Studio",
    category: "Photography",
    location: "Vastrapur, Ahmedabad",
    rating: 4.90,
    reviewsCount: 94,
    verified: true,
    basePrice: 55000,
    coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    description: "Award-winning candid wedding storytellers, 4K cinematic teasers, and drone aerial wedding shoots.",
    tags: ["Candid Photography", "Cinematic 4K", "Drone Shoots", "Pre-Wedding"],
  },
  {
    id: "vnd_aura_decors",
    businessName: "Aura Luxury Stage & Floral Decors",
    category: "Decoration",
    location: "Bodakdev, Ahmedabad",
    rating: 4.85,
    reviewsCount: 76,
    verified: true,
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
    rating: 4.95,
    reviewsCount: 110,
    verified: true,
    basePrice: 35000,
    coverImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80",
    description: "High-energy club DJ setups, celebrity sangeet nights, JBL line array sound & intelligent CO2 fog jets.",
    tags: ["Sangeet DJ", "Line Array Audio", "Cold Pyro", "Laser Shows"],
  },
];

export default function VendorDiscovery({ onSelectVendor, onOpenVendorPortal }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [vendors, setVendors] = useState(DEFAULT_VENDORS);
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadVendors() {
      setIsLoading(true);
      const isLive = await checkBackendHealth();
      setIsBackendLive(isLive);

      if (isLive) {
        try {
          const res = await fetchVendors({
            category: selectedCategory !== "all" ? selectedCategory.toLowerCase() : undefined,
          });
          if (res && res.items && res.items.length > 0) {
            // Merge backend data with cover images & tags
            const merged = res.items.map((item, idx) => {
              const fallback = DEFAULT_VENDORS[idx % DEFAULT_VENDORS.length];
              return {
                id: item.id,
                businessName: item.businessName,
                category: item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : fallback.category,
                location: item.location || fallback.location,
                rating: item.rating ? parseFloat(item.rating) : fallback.rating,
                reviewsCount: fallback.reviewsCount,
                verified: item.verified !== undefined ? item.verified : true,
                basePrice: fallback.basePrice,
                coverImage: fallback.coverImage,
                description: item.description || fallback.description,
                tags: fallback.tags,
              };
            });
            setVendors(merged);
          } else {
            setVendors(DEFAULT_VENDORS);
          }
        } catch (e) {
          console.warn("Backend fetch failed, using demo vendors:", e);
          setVendors(DEFAULT_VENDORS);
        }
      } else {
        setVendors(DEFAULT_VENDORS);
      }
      setIsLoading(false);
    }

    loadVendors();
  }, [selectedCategory]);

  const categories = ["all", "Catering", "Photography", "Decoration", "DJ & Music"];

  const filteredVendors = vendors.filter((v) => {
    const matchesCategory =
      selectedCategory === "all" || v.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      v.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="discovery-section">
      <div className="discovery-topbar">
        <div>
          <div className="flex items-center gap-3">
            <h2>✨ Verified Event Service Vendors</h2>
            {isBackendLive ? (
              <span className="badge-verified">🟢 Live Database (Port 3002)</span>
            ) : (
              <span className="badge-rating">🟡 Offline Demo Mode</span>
            )}
          </div>
          <p>Discover, compare, and instantly book top event professionals.</p>
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

      {/* Search and Category Filter Bar */}
      <div className="filter-controls-row">
        <div className="search-input-wrap">
          <input
            type="text"
            placeholder="🔍 Search vendor name, cuisine, city, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-pills-row">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`pill-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="vendor-marketplace-grid">
        {isLoading ? (
          <p className="text-slate-400">Loading verified vendors...</p>
        ) : filteredVendors.length > 0 ? (
          filteredVendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onBookNow={onSelectVendor}
            />
          ))
        ) : (
          <p className="text-slate-400">No vendors found matching your criteria.</p>
        )}
      </div>
    </div>
  );
}
