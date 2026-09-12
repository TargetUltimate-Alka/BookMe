import { useState } from "react";
import VendorCard from "./VendorCard";

export default function VendorDiscovery({ onSelectVendor, onOpenVendorPortal }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [vendors] = useState([
    {
      id: "vnd_1",
      businessName: "Sunset Royal Caterers & Events",
      category: "Catering",
      location: "SG Highway, Ahmedabad",
      rating: 4.9,
      reviewsCount: 42,
      verified: true,
      basePrice: 45000,
      coverImage: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80",
      description: "Specialized in royal destination wedding buffets, multi-cuisine live counters & artisanal mocktail lounges.",
      tags: ["Live Chaat", "Mocktail Bar", "100% Pure Veg", "Destination Setup"],
    },
    {
      id: "vnd_2",
      businessName: "Dream Clicks Cinematic Studio",
      category: "Photography",
      location: "Vastrapur, Ahmedabad",
      rating: 4.85,
      reviewsCount: 38,
      verified: true,
      basePrice: 55000,
      coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
      description: "Award-winning candid wedding photographers, 4K cinematic teasers, and drone aerial wedding shoots.",
      tags: ["Candid Photography", "Cinematic 4K", "Drone Shoots", "Pre-Wedding"],
    },
    {
      id: "vnd_3",
      businessName: "Aura Luxury Stage & Floral Decors",
      category: "Decoration",
      location: "Bodakdev, Ahmedabad",
      rating: 4.8,
      reviewsCount: 29,
      verified: true,
      basePrice: 65000,
      coverImage: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80",
      description: "Grand entrance floral arches, dynamic LED tunnel stages, and royal wedding mandap architectural setups.",
      tags: ["Floral Mandap", "LED Stage", "Theme Decors", "Lighting Ambience"],
    },
    {
      id: "vnd_4",
      businessName: "Electra DJ & Sound Innovations",
      category: "DJ & Music",
      location: "Prahlad Nagar, Ahmedabad",
      rating: 4.95,
      reviewsCount: 51,
      verified: true,
      basePrice: 35000,
      coverImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80",
      description: "High-energy club DJ setups, celebrity sangeet nights, JBL line array sound & intelligent CO2 fog jets.",
      tags: ["Sangeet DJ", "Line Array Audio", "Cold Pyro", "Laser Shows"],
    },
  ]);

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
          <h2>✨ Verified Event Service Vendors</h2>
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
        {filteredVendors.map((vendor) => (
          <VendorCard
            key={vendor.id}
            vendor={vendor}
            onBookNow={onSelectVendor}
          />
        ))}
      </div>
    </div>
  );
}
