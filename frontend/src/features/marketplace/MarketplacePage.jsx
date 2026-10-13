import { useState, useEffect, useCallback } from "react";
import "./marketplace.css";
import { MarketplaceHeader } from "./MarketplaceHeader";
import { MarketplaceHero } from "./MarketplaceHero";
import { MarketplaceCategories } from "./MarketplaceCategories";
import { MarketplaceVendors } from "./MarketplaceVendors";
import { VendorDetailsModal } from "./VendorDetailsModal";
import { WishlistModal } from "./WishlistModal";
import { NotifyMeModal } from "./NotifyMeModal";
import { MarketplaceFooter } from "./MarketplaceFooter";
import {
  fetchVendors,
  checkBackendHealth,
} from "../vendor/api";

const CURATED_DEFAULT_VENDORS = [
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
    description: "Specialized in royal destination wedding buffets, multi-cuisine live counters, dessert bars & artisanal mocktail lounges.",
    tags: ["Live Chaat", "Mocktail Bar", "100% Pure Veg", "10% Festive Off"],
  },
  {
    id: "vnd_dream_clicks",
    businessName: "Dream Clicks Cinematic Studio",
    category: "Photography",
    location: "Vastrapur, Ahmedabad",
    serviceRadiusKm: 100,
    rating: 4.92,
    reviewsCount: 94,
    verified: true,
    isDemo: false,
    basePrice: 55000,
    coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    description: "Award-winning candid wedding storytellers, 4K cinematic teasers, traditional portraits, and DGCA-compliant drone aerial shoots.",
    tags: ["Candid Photography", "Cinematic 4K", "Drone Shoots", "Pre-Wedding"],
  },
  {
    id: "vnd_aura_decors",
    businessName: "Aura Luxury Stage & Floral Decors",
    category: "Decoration",
    location: "Bodakdev, Ahmedabad",
    serviceRadiusKm: 60,
    rating: 4.88,
    reviewsCount: 76,
    verified: true,
    isDemo: false,
    basePrice: 65000,
    hasActiveDiscount: true,
    coverImage: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80",
    description: "Grand entrance floral arches, dynamic LED tunnel stages, and royal wedding mandap architectural setups with mood lighting.",
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
    description: "High-energy club DJ setups, celebrity sangeet nights, JBL line array sound console & intelligent cold spark CO2 fog jets.",
    tags: ["Sangeet DJ", "Line Array Audio", "Cold Pyro", "Laser Shows"],
  },
  {
    id: "vnd_glamour_studio",
    businessName: "Glamour Glow Bridal Studio & Spa",
    category: "Makeup & Beauty",
    location: "Navrangpura, Ahmedabad",
    serviceRadiusKm: 40,
    rating: 4.9,
    reviewsCount: 88,
    verified: true,
    isDemo: false,
    basePrice: 22000,
    coverImage: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80",
    description: "Celebrity bridal HD airbrush makeup, pre-wedding skin prep, saree draping, and customized bridesmaid makeover packages.",
    tags: ["HD Airbrush", "Bridal Glow", "Hair Styling", "Saree Draping"],
  },
  {
    id: "vnd_royal_henna",
    businessName: "Royal Rajasthani Mehndi Art",
    category: "Mehndi Artists",
    location: "Maninagar, Ahmedabad",
    serviceRadiusKm: 50,
    rating: 4.93,
    reviewsCount: 65,
    verified: true,
    isDemo: false,
    basePrice: 15000,
    hasActiveDiscount: true,
    coverImage: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
    description: "Traditional Marwari, intricate Arabic, and customized portrait bridal mehndi designs using 100% organic herbal henna paste.",
    tags: ["Bridal Henna", "Organic Henna", "Portrait Mehndi", "Arabic Design"],
  },
  {
    id: "vnd_luxe_tents",
    businessName: "Luxe Canopy & Shamiana Works",
    category: "Tents & Event Setup",
    location: "Thaltej, Ahmedabad",
    serviceRadiusKm: 75,
    rating: 4.85,
    reviewsCount: 52,
    verified: true,
    isDemo: false,
    basePrice: 48000,
    coverImage: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&q=80",
    description: "Waterproof German pagoda tents, luxury AC marquees, royal velvet sofas, and complete outdoor lawn wedding infrastructure.",
    tags: ["German Pagoda", "AC Marquees", "Royal Sofas", "Outdoor Setup"],
  },
  {
    id: "vnd_vintage_wheels",
    businessName: "Heritage Vintage Wedding Cars",
    category: "Transportation",
    location: "Paldi, Ahmedabad",
    serviceRadiusKm: 120,
    rating: 4.97,
    reviewsCount: 42,
    verified: true,
    isDemo: false,
    basePrice: 28000,
    coverImage: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80",
    description: "Chauffeur-driven classic open-top vintage cars and luxury bridal sedans for grand groom baraat and bride vidai arrivals.",
    tags: ["Vintage Convertible", "Chauffeur Driven", "Baraat Car", "Decorated"],
  },
];

export function MarketplacePage({
  user,
  isAuthenticated,
  onBookNow,
  onNavigateToAuth,
  onNavigateToBookings,
  onNavigateToEvents,
  onNavigateToVendorPortal,
  onOpenProfile,
  onLogout,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [vendors, setVendors] = useState(CURATED_DEFAULT_VENDORS);
  const [isLoading, setIsLoading] = useState(false);
  const [totalMatches, setTotalMatches] = useState(CURATED_DEFAULT_VENDORS.length);

  // Modals state
  const [selectedVendorForModal, setSelectedVendorForModal] = useState(null);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [notifyModalContext, setNotifyModalContext] = useState(null);

  // Local Wishlist storage
  const [wishlistIds, setWishlistIds] = useState(() => {
    try {
      const saved = localStorage.getItem("bookme_wishlist_ids");
      return saved ? JSON.parse(saved) : ["vnd_sunset_caterers", "vnd_dream_clicks"];
    } catch {
      return ["vnd_sunset_caterers", "vnd_dream_clicks"];
    }
  });

  const toggleWishlist = useCallback((vendor) => {
    setWishlistIds((prev) => {
      const next = prev.includes(vendor.id)
        ? prev.filter((id) => id !== vendor.id)
        : [...prev, vendor.id];
      try {
        localStorage.setItem("bookme_wishlist_ids", JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  // Fetch vendors from live backend or fallback gracefully
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const isLive = await checkBackendHealth();
        if (isLive) {
          const res = await fetchVendors({
            q: searchQuery || undefined,
            category: selectedCategory !== "all" ? selectedCategory : undefined,
            location: selectedLocation !== "all" ? selectedLocation : undefined,
            limit: 24,
          });

          if (isMounted && res && Array.isArray(res.items)) {
            const merged = res.items.map((item, idx) => {
              const fallback = CURATED_DEFAULT_VENDORS[idx % CURATED_DEFAULT_VENDORS.length];
              return {
                ...item,
                id: item.id,
                businessName: item.businessName || fallback.businessName,
                category: item.category || fallback.category,
                location: item.location || fallback.location,
                rating: item.rating ? parseFloat(item.rating) : fallback.rating,
                reviewsCount: item.reviewCount ?? fallback.reviewsCount,
                verified: Boolean(item.verified ?? fallback.verified),
                isDemo: Boolean(item.isDemo),
                basePrice: item.startingPriceInr ?? fallback.basePrice,
                coverImage: item.photoUrl || fallback.coverImage,
                description: item.description || fallback.description,
                tags:
                  item.categories?.length > 0
                    ? item.categories.map((c) => c.name)
                    : fallback.tags,
                hasActiveDiscount: Boolean(item.hasActiveDiscount ?? fallback.hasActiveDiscount),
              };
            });

            setVendors(merged);
            setTotalMatches(res.totalItems !== undefined ? res.totalItems : merged.length);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to curated vendors below
      }

      if (isMounted) {
        let list = CURATED_DEFAULT_VENDORS;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const tokens = q.split(/[\s,+/]+/).filter(Boolean);
          list = list.filter((v) => {
            const h = `${v.businessName} ${v.category} ${v.description} ${v.location} ${(v.tags || []).join(' ')}`.toLowerCase();
            return h.includes(q) || tokens.every((t) => h.includes(t));
          });
        }
        if (selectedCategory !== "all") {
          const catLower = selectedCategory.toLowerCase();
          list = list.filter((v) => {
            const vc = (v.category || "").toLowerCase();
            return (
              vc.includes(catLower) ||
              catLower.includes(vc) ||
              (v.tags || []).some((t) => t.toLowerCase().includes(catLower) || catLower.includes(t.toLowerCase()))
            );
          });
        }
        if (selectedLocation !== "all") {
          list = list.filter((v) =>
            v.location && v.location.toLowerCase().includes(selectedLocation.toLowerCase())
          );
        }

        setVendors(list);
        setTotalMatches(list.length);
        setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedCategory, selectedLocation]);

  // Wishlisted vendors list
  const wishlistedVendors = vendors.filter((v) => wishlistIds.includes(v.id));

  return (
    <div className="marketplace-page">
      {/* Top Blinkit-style Notification Ribbon */}
      <div className="marketplace-top-ribbon">
        <span>⚡ Plan Wedding & Party Celebrations with 40% Escrow Protection</span>
        <span>•</span>
        <span>Zero Hidden Fees</span>
        <span>•</span>
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
        >
          Explore All Verified Vendors →
        </button>
      </div>

      {/* Main Header Bar */}
      <MarketplaceHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        user={user}
        isAuthenticated={isAuthenticated}
        wishlistCount={wishlistIds.length}
        onOpenWishlist={() => setIsWishlistModalOpen(true)}
        onNavigateToAuth={onNavigateToAuth}
        onNavigateToBookings={onNavigateToBookings}
        onNavigateToEvents={onNavigateToEvents}
        onNavigateToVendorPortal={onNavigateToVendorPortal}
        onOpenProfile={onOpenProfile}
        onLogout={onLogout}
        onBrandClick={() => {
          setSelectedCategory("all");
          setSelectedLocation("all");
          setSearchQuery("");
        }}
      />

      {/* Hero Section */}
      <MarketplaceHero
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        onSearchSubmit={({ eventType, location }) => {
          if (location && location !== "all") setSelectedLocation(location);
          if (eventType === "wedding") setSelectedCategory("Photography");
          else if (eventType === "birthday") setSelectedCategory("DJ & Music");
          else if (eventType === "corporate") setSelectedCategory("Catering");
        }}
      />

      {/* Service Categories Quick-Nav Bar & Visual Grid */}
      <MarketplaceCategories
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Flash Benefits Strip (Blinkit / Flipkart Usability) */}
      <div className="flash-benefits-bar">
        <div className="flash-benefits-inner">
          <div className="flash-benefit-item">
            <div className="flash-benefit-icon">🛡️</div>
            <div className="flash-benefit-text">
              <h4>100% KYC Verified</h4>
              <p>Government ID & Bank penny-drop checked</p>
            </div>
          </div>
          <div className="flash-benefit-item">
            <div className="flash-benefit-icon">🔒</div>
            <div className="flash-benefit-text">
              <h4>40% Escrow Deposit</h4>
              <p>Funds released only after event success</p>
            </div>
          </div>
          <div className="flash-benefit-item">
            <div className="flash-benefit-icon">💬</div>
            <div className="flash-benefit-text">
              <h4>Direct In-App Chat</h4>
              <p>No middlemen or broker commissions</p>
            </div>
          </div>
          <div className="flash-benefit-item">
            <div className="flash-benefit-icon">⏱️</div>
            <div className="flash-benefit-text">
              <h4>12-Hour Confirmation</h4>
              <p>Guaranteed response window or auto-refund</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Marketplace Vendor Grid */}
      <MarketplaceVendors
        vendors={vendors}
        isLoading={isLoading}
        onBookNow={onBookNow}
        onViewDetails={(vendor) => setSelectedVendorForModal(vendor)}
        onToggleWishlist={toggleWishlist}
        wishlistIds={wishlistIds}
        onNotifyMe={(ctx) => setNotifyModalContext(ctx)}
        filterCategory={selectedCategory}
        searchQuery={searchQuery}
        totalMatches={totalMatches}
      />

      {/* How BookMe Works Section */}
      <section className="how-it-works-section" aria-labelledby="how-it-works-title">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Effortless Event Planning
          </span>
          <h2 id="how-it-works-title" style={{ fontSize: "1.875rem", fontWeight: 800, color: "#0f172a", margin: "6px 0 10px 0" }}>
            How BookMe Works
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.9375rem", margin: 0 }}>
            From dream mandaps to 4K candid wedding captures, coordinate everything with total transparency.
          </p>
        </div>

        <div className="how-it-works-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Discover & Compare</h3>
            <p>
              Browse verified studios, caterers, and decorators. Review genuine portfolios, guest capacities, and transparent pricing.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Customize & Request</h3>
            <p>
              Pick package inclusions, add-ons, and plates. Submit a booking request with guaranteed 12-hour vendor response windows.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Lock with 40% Escrow</h3>
            <p>
              Confirm your booking by paying a 40% deposit held securely in escrow. Balance 60% is due only 48h before the event.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">4</div>
            <h3>Celebrate Stress-Free</h3>
            <p>
              Coordinate details seamlessly via in-app private chat and calls. Release payouts only after the celebration wraps up.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Safety Section */}
      <section className="trust-safety-section" aria-labelledby="trust-safety-title">
        <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
          <h2 id="trust-safety-title" style={{ fontSize: "1.875rem", fontWeight: 800, margin: "0 0 10px 0" }}>
            Built for Trust, Safety & Transparency
          </h2>
          <p style={{ color: "#cbd5e1", fontSize: "0.9375rem", margin: 0 }}>
            Every vendor is strictly vetted and every payment is backed by regulated payment rails.
          </p>
        </div>

        <div className="trust-safety-grid">
          <div className="trust-card">
            <div style={{ fontSize: "2rem" }}>🔐</div>
            <h3>Escrow Payment Protection</h3>
            <p>
              We partner with licensed payment aggregators. Your money is never transferred prematurely — it stays locked in escrow until the vendor delivers.
            </p>
          </div>

          <div className="trust-card">
            <div style={{ fontSize: "2rem" }}>🆔</div>
            <h3>Rigorous DigiLocker KYC</h3>
            <p>
              All BookMe vendors undergo Aadhaar-masked DigiLocker identity verification, PAN verification, and bank penny-drop testing before listing.
            </p>
          </div>

          <div className="trust-card">
            <div style={{ fontSize: "2rem" }}>📜</div>
            <h3>Clear Cancellation Matrix</h3>
            <p>
              Standardized refund and penalty rules per SRS §2.4 protect both hosts and service providers against unexpected cancellations and no-shows.
            </p>
          </div>
        </div>
      </section>

      {/* Comprehensive Marketplace Footer */}
      <MarketplaceFooter
        onCategoryClick={(cat) => setSelectedCategory(cat)}
        onNavigateToAuth={onNavigateToAuth}
        onNavigateToVendorPortal={onNavigateToVendorPortal}
      />

      {/* Vendor Profile & Package Details Modal */}
      <VendorDetailsModal
        isOpen={Boolean(selectedVendorForModal)}
        onClose={() => setSelectedVendorForModal(null)}
        vendor={selectedVendorForModal}
        onBookNow={(vendor, pkg) => onBookNow(vendor, pkg)}
        isWishlisted={selectedVendorForModal ? wishlistIds.includes(selectedVendorForModal.id) : false}
        onToggleWishlist={toggleWishlist}
      />

      {/* Wishlist Modal */}
      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        wishlistVendors={wishlistedVendors}
        onRemoveFromWishlist={(id) => {
          setWishlistIds((prev) => prev.filter((item) => item !== id));
        }}
        onBookNow={(vendor) => {
          setIsWishlistModalOpen(false);
          onBookNow(vendor);
        }}
      />

      {/* Notify Me Modal */}
      <NotifyMeModal
        isOpen={Boolean(notifyModalContext)}
        onClose={() => setNotifyModalContext(null)}
        context={notifyModalContext || {}}
      />
    </div>
  );
}
