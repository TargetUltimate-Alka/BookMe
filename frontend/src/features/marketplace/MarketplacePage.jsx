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

// Comprehensive multi-city verified event vendors catalog
// Covering all 11 event service categories across Udaipur, Ahmedabad, Jaipur, Mumbai, Delhi NCR, and Pan-India
const CURATED_DEFAULT_VENDORS = [
  // --- 1. CATERING & COOKS ---
  {
    id: "vnd_udaipur_mewari_caterers",
    businessName: "Royal Mewar Imperial Caterers & Cooks",
    category: "Catering",
    location: "Fateh Sagar, Udaipur, Rajasthan",
    city: "Udaipur",
    latitude: 24.595,
    longitude: 73.675,
    serviceRadiusKm: 120,
    rating: 4.98,
    reviewsCount: 142,
    verified: true,
    isDemo: false,
    basePrice: 38500,
    originalPriceInr: 45000,
    hasActiveDiscount: true,
    discountBadge: "15% FESTIVE OFF",
    discountPercent: 15,
    coverImage: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80",
    description: "Royal Mewari destination wedding buffets, signature Dal Baati Churma royal thalis, multi-cuisine live food counters, and artisanal mocktail lounges.",
    tags: ["Mewari Buffet", "Live Chaat", "100% Pure Veg", "15% Festive Off", "Destination Specialist"],
  },
  {
    id: "vnd_sunset_caterers",
    businessName: "Sunset Royal Caterers & Event Crafters",
    category: "Catering",
    location: "SG Highway, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    latitude: 23.033,
    longitude: 72.507,
    serviceRadiusKm: 250,
    rating: 4.96,
    reviewsCount: 128,
    verified: true,
    isDemo: false,
    basePrice: 40500,
    originalPriceInr: 45000,
    hasActiveDiscount: true,
    discountBadge: "10% FESTIVE OFF",
    discountPercent: 10,
    coverImage: "https://images.unsplash.com/photo-1547928576-a4a33237cbc3?auto=format&fit=crop&w=600&q=80",
    description: "Specialized in luxury destination buffets across Gujarat and Rajasthan, live Delhi chaat counters, and international dessert bars.",
    tags: ["Live Chaat", "Mocktail Bar", "100% Pure Veg", "10% Festive Off", "Rajasthan & Gujarat"],
  },
  {
    id: "vnd_rajputana_culinary",
    businessName: "Rajputana Royal Feast & Gourmet Cooks",
    category: "Catering",
    location: "C-Scheme, Jaipur, Rajasthan",
    city: "Jaipur",
    latitude: 26.912,
    longitude: 75.787,
    serviceRadiusKm: 300,
    rating: 4.93,
    reviewsCount: 89,
    verified: true,
    isDemo: false,
    basePrice: 42000,
    originalPriceInr: 48000,
    hasActiveDiscount: true,
    discountBadge: "FLAT ₹6,000 OFF",
    discountPercent: 12,
    coverImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
    description: "Authentic royal Rajputana thalis, Jain specialty cooking, live tandoor and dessert station chefs for destination marriages.",
    tags: ["Gourmet Cooks", "Jain Friendly", "Live Tandoor", "Flat ₹6,000 Off"],
  },

  // --- 2. PHOTOGRAPHY & VIDEOGRAPHY ---
  {
    id: "vnd_udaipur_lake_clicks",
    businessName: "Lake City Candid Photography & Cinema",
    category: "Photography",
    location: "City Palace Road, Udaipur, Rajasthan",
    city: "Udaipur",
    latitude: 24.576,
    longitude: 73.683,
    serviceRadiusKm: 150,
    rating: 4.97,
    reviewsCount: 165,
    verified: true,
    isDemo: false,
    basePrice: 49500,
    originalPriceInr: 60000,
    hasActiveDiscount: true,
    discountBadge: "20% EARLY BIRD",
    discountPercent: 20,
    coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    description: "Award-winning lakefront pre-wedding shoots, 4K candid wedding films, DGCA drone aerial captures, and premium handcrafted flush-mount albums.",
    tags: ["Lake Palace Shoots", "Candid 4K", "Drone Certified", "20% Early Bird", "Instagram Reels"],
  },
  {
    id: "vnd_dream_clicks",
    businessName: "Dream Clicks Cinematic Studio",
    category: "Photography",
    location: "Vastrapur, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    latitude: 23.035,
    longitude: 72.529,
    serviceRadiusKm: 250,
    rating: 4.92,
    reviewsCount: 94,
    verified: true,
    isDemo: false,
    basePrice: 55000,
    originalPriceInr: 62000,
    hasActiveDiscount: true,
    discountBadge: "10% WEDDING SPECIAL",
    discountPercent: 10,
    coverImage: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=600&q=80",
    description: "Creative visual storytellers delivering same-day teaser edits, candid cinematography, and traditional portraits with color-graded master audio.",
    tags: ["Candid Photography", "Cinematic 4K", "Same-Day Edit", "Pre-Wedding"],
  },
  {
    id: "vnd_royal_framing_jaipur",
    businessName: "Royal Heritage Moments Photography",
    category: "Photography",
    location: "Vaishali Nagar, Jaipur, Rajasthan",
    city: "Jaipur",
    latitude: 26.908,
    longitude: 75.748,
    serviceRadiusKm: 300,
    rating: 4.9,
    reviewsCount: 78,
    verified: true,
    isDemo: false,
    basePrice: 48000,
    originalPriceInr: 55000,
    hasActiveDiscount: true,
    discountBadge: "15% FESTIVE OFF",
    discountPercent: 15,
    coverImage: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&q=80",
    description: "Palace destination photography specialists, drone videography, traditional portraits, and heirloom wedding albums.",
    tags: ["Palace Shoots", "Drone 4K", "Traditional Photo", "15% Festive Off"],
  },

  // --- 3. DJ & MUSIC ---
  {
    id: "vnd_udaipur_beats_dj",
    businessName: "Lake Beats Royal DJ & Sound",
    category: "DJ & Music",
    location: "Hiran Magri, Udaipur, Rajasthan",
    city: "Udaipur",
    latitude: 24.568,
    longitude: 73.712,
    serviceRadiusKm: 120,
    rating: 4.96,
    reviewsCount: 118,
    verified: true,
    isDemo: false,
    basePrice: 32000,
    originalPriceInr: 38000,
    hasActiveDiscount: true,
    discountBadge: "15% OFF SANGEET",
    discountPercent: 15,
    coverImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80",
    description: "JBL line array concert audio, intelligent moving heads, cold spark CO2 jets, and curated Bollywood/Punjabi sangeet party DJ sets.",
    tags: ["Sangeet DJ", "Cold Pyro", "JBL Line Array", "15% Off Sangeet", "Baraat Audio"],
  },
  {
    id: "vnd_electra_dj",
    businessName: "Electra DJ & Sound Innovations",
    category: "DJ & Music",
    location: "Prahlad Nagar, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    latitude: 23.012,
    longitude: 72.51,
    serviceRadiusKm: 200,
    rating: 4.95,
    reviewsCount: 110,
    verified: true,
    isDemo: false,
    basePrice: 35000,
    originalPriceInr: 40000,
    hasActiveDiscount: true,
    discountBadge: "10% FESTIVE OFF",
    discountPercent: 10,
    coverImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    description: "High-energy club DJ setups, celebrity sangeet nights, Pioneer DJ consoles, and stage fog effects.",
    tags: ["Sangeet DJ", "Line Array Audio", "Cold Pyro", "Laser Shows"],
  },
  {
    id: "vnd_mewar_dhol_troup",
    businessName: "Mewari Dhol & Live Symphony Brass",
    category: "DJ & Music",
    location: "Sukher, Udaipur, Rajasthan",
    city: "Udaipur",
    latitude: 24.628,
    longitude: 73.725,
    serviceRadiusKm: 100,
    rating: 4.91,
    reviewsCount: 64,
    verified: true,
    isDemo: false,
    basePrice: 22000,
    originalPriceInr: 26000,
    hasActiveDiscount: true,
    discountBadge: "15% FESTIVE OFF",
    discountPercent: 15,
    coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    description: "High-energy authentic Punjabi and Rajasthani Dhol troupes with live wedding brass band for groom baraat arrivals.",
    tags: ["Punjabi Dhol", "Baraat Band", "Live Symphony", "15% Festive Off"],
  },

  // --- 4. DECORATION & BALLOONS ---
  {
    id: "vnd_udaipur_mandap_decors",
    businessName: "Mewar Royal Mandap & Lake Decors",
    category: "Decoration",
    location: "Panchwati, Udaipur, Rajasthan",
    city: "Udaipur",
    latitude: 24.598,
    longitude: 73.692,
    serviceRadiusKm: 120,
    rating: 4.95,
    reviewsCount: 135,
    verified: true,
    isDemo: false,
    basePrice: 58000,
    originalPriceInr: 70000,
    hasActiveDiscount: true,
    discountBadge: "18% FESTIVE OFF",
    discountPercent: 18,
    coverImage: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80",
    description: "Architectural fresh flower mandaps, lakeside floating lotus stages, fairy light tunnels, and grand royal entrance arches.",
    tags: ["Lakeside Mandap", "Fresh Flowers", "LED Arch", "18% Festive Off", "Maharaja Sofas"],
  },
  {
    id: "vnd_aura_decors",
    businessName: "Aura Luxury Stage & Floral Decors",
    category: "Decoration",
    location: "Bodakdev, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    latitude: 23.04,
    longitude: 72.511,
    serviceRadiusKm: 250,
    rating: 4.88,
    reviewsCount: 76,
    verified: true,
    isDemo: false,
    basePrice: 65000,
    originalPriceInr: 72000,
    hasActiveDiscount: true,
    discountBadge: "10% WEDDING SPECIAL",
    discountPercent: 10,
    coverImage: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=600&q=80",
    description: "Grand entrance floral arches, dynamic LED tunnel stages, and royal wedding mandap architectural setups with mood lighting.",
    tags: ["Floral Mandap", "LED Stage", "Theme Decors", "Lighting Ambience"],
  },
  {
    id: "vnd_balloon_bliss",
    businessName: "Celebration Balloon Bliss & Theme Decors",
    category: "Decoration",
    location: "C-Scheme, Jaipur, Rajasthan",
    city: "Jaipur",
    latitude: 26.915,
    longitude: 75.792,
    serviceRadiusKm: 100,
    rating: 4.92,
    reviewsCount: 82,
    verified: true,
    isDemo: false,
    basePrice: 18000,
    originalPriceInr: 22000,
    hasActiveDiscount: true,
    discountBadge: "FLAT ₹4,000 OFF",
    discountPercent: 18,
    coverImage: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=80",
    description: "Organic balloon garlands, customized neon sign backdrops, pastel balloon arches for birthdays, anniversaries, and baby showers.",
    tags: ["Pastel Balloons", "Neon Signs", "Birthday Decor", "Flat ₹4,000 Off"],
  },

  // --- 5. MAKEUP & BEAUTY ---
  {
    id: "vnd_udaipur_bridal_glow",
    businessName: "Mewar Bride HD Airbrush Studio",
    category: "Makeup & Beauty",
    location: "Saheli Nagar, Udaipur, Rajasthan",
    city: "Udaipur",
    latitude: 24.602,
    longitude: 73.689,
    serviceRadiusKm: 80,
    rating: 4.97,
    reviewsCount: 112,
    verified: true,
    isDemo: false,
    basePrice: 19500,
    originalPriceInr: 24000,
    hasActiveDiscount: true,
    discountBadge: "20% BRIDAL COMBO",
    discountPercent: 20,
    coverImage: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80",
    description: "Celebrity bridal HD airbrush makeover, Mac/Dior product line, pre-wedding skin glow prep, designer saree draping, and customized bridesmaid packages.",
    tags: ["HD Airbrush", "Bridal Glow", "Dior/Mac", "20% Bridal Combo", "Saree Draping"],
  },
  {
    id: "vnd_glamour_studio",
    businessName: "Glamour Glow Bridal Studio & Spa",
    category: "Makeup & Beauty",
    location: "Navrangpura, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    latitude: 23.037,
    longitude: 72.558,
    serviceRadiusKm: 100,
    rating: 4.9,
    reviewsCount: 88,
    verified: true,
    isDemo: false,
    basePrice: 22000,
    originalPriceInr: 25000,
    hasActiveDiscount: true,
    discountBadge: "12% OFF",
    discountPercent: 12,
    coverImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
    description: "Bridal HD makeup, hair styling, skin prep, and bridal party makeover packages.",
    tags: ["HD Airbrush", "Bridal Glow", "Hair Styling", "Saree Draping"],
  },

  // --- 6. MEHNDI ARTISTS ---
  {
    id: "vnd_udaipur_henna_art",
    businessName: "Udaipur Royal Marwari Mehndi Art",
    category: "Mehndi Artists",
    location: "Bapu Bazaar, Udaipur, Rajasthan",
    city: "Udaipur",
    latitude: 24.582,
    longitude: 73.693,
    serviceRadiusKm: 90,
    rating: 4.96,
    reviewsCount: 95,
    verified: true,
    isDemo: false,
    basePrice: 13500,
    originalPriceInr: 16000,
    hasActiveDiscount: true,
    discountBadge: "15% FESTIVE OFF",
    discountPercent: 15,
    coverImage: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
    description: "100% organic natural herbal henna, intricate Marwari figures, groom portrait bridal designs, and customized Arabic mehndi for sangeet guests.",
    tags: ["Portrait Mehndi", "100% Organic Henna", "Marwari Art", "15% Festive Off", "Arabic Design"],
  },
  {
    id: "vnd_royal_henna",
    businessName: "Royal Rajasthani Mehndi Art",
    category: "Mehndi Artists",
    location: "Maninagar, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    latitude: 22.997,
    longitude: 72.602,
    serviceRadiusKm: 150,
    rating: 4.93,
    reviewsCount: 65,
    verified: true,
    isDemo: false,
    basePrice: 15000,
    originalPriceInr: 17500,
    hasActiveDiscount: true,
    discountBadge: "10% FESTIVE OFF",
    discountPercent: 10,
    coverImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80",
    description: "Traditional Marwari, intricate Arabic, and customized portrait bridal mehndi designs using herbal henna paste.",
    tags: ["Bridal Henna", "Organic Henna", "Portrait Mehndi", "Arabic Design"],
  },

  // --- 7. LIGHTING & EFFECTS ---
  {
    id: "vnd_lumiere_lighting",
    businessName: "Lumiere Intelligent Lighting & Truss",
    category: "Lighting",
    location: "Hiran Magri, Udaipur, Rajasthan",
    city: "Udaipur",
    latitude: 24.571,
    longitude: 73.718,
    serviceRadiusKm: 120,
    rating: 4.94,
    reviewsCount: 84,
    verified: true,
    isDemo: false,
    basePrice: 28000,
    originalPriceInr: 35000,
    hasActiveDiscount: true,
    discountBadge: "20% FESTIVE OFF",
    discountPercent: 20,
    coverImage: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    description: "Palace illumination wash, truss architectural lighting, fairy light canopies, moving sharpies, and intelligent DMX stage effects.",
    tags: ["Truss Lighting", "LED Wash", "Fairy Canopies", "20% Festive Off", "Moving Heads"],
  },
  {
    id: "vnd_spectro_lights",
    businessName: "Spectrum Concert Lights & LED Displays",
    category: "Lighting",
    location: "SG Highway, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    latitude: 23.036,
    longitude: 72.505,
    serviceRadiusKm: 250,
    rating: 4.9,
    reviewsCount: 62,
    verified: true,
    isDemo: false,
    basePrice: 32000,
    originalPriceInr: 36000,
    hasActiveDiscount: true,
    discountBadge: "10% OFF",
    discountPercent: 10,
    coverImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    description: "High-definition P3 LED video walls, laser show synchronization, and grand wedding reception stage lighting.",
    tags: ["P3 LED Wall", "Laser Show", "Ambient Wash", "Concert Grade"],
  },

  // --- 8. TENTS & EVENT SETUP ---
  {
    id: "vnd_udaipur_royal_tents",
    businessName: "Mewar Pagoda Tents & AC Shamianas",
    category: "Tents & Event Setup",
    location: "Sukher, Udaipur, Rajasthan",
    city: "Udaipur",
    latitude: 24.632,
    longitude: 73.729,
    serviceRadiusKm: 120,
    rating: 4.93,
    reviewsCount: 79,
    verified: true,
    isDemo: false,
    basePrice: 42000,
    originalPriceInr: 50000,
    hasActiveDiscount: true,
    discountBadge: "16% FESTIVE OFF",
    discountPercent: 16,
    coverImage: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&q=80",
    description: "All-weather German pagoda marquees, air-conditioned luxury shamianas, royal velvet low-seating diwans, and outdoor lawn infrastructure.",
    tags: ["German Pagoda", "AC Shamiana", "Royal Diwans", "16% Festive Off", "Outdoor Infrastructure"],
  },
  {
    id: "vnd_luxe_tents",
    businessName: "Luxe Canopy & Shamiana Works",
    category: "Tents & Event Setup",
    location: "Thaltej, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    latitude: 23.05,
    longitude: 72.518,
    serviceRadiusKm: 200,
    rating: 4.85,
    reviewsCount: 52,
    verified: true,
    isDemo: false,
    basePrice: 48000,
    originalPriceInr: 54000,
    hasActiveDiscount: true,
    discountBadge: "10% OFF",
    discountPercent: 10,
    coverImage: "https://images.unsplash.com/photo-1478147427282-58a87a120781?auto=format&fit=crop&w=600&q=80",
    description: "Waterproof German pagoda tents, luxury AC marquees, royal velvet sofas, and complete outdoor lawn wedding infrastructure.",
    tags: ["German Pagoda", "AC Marquees", "Royal Sofas", "Outdoor Setup"],
  },

  // --- 9. TRANSPORTATION & LUXURY CARS ---
  {
    id: "vnd_udaipur_royal_wheels",
    businessName: "Lake City Vintage Cars & Luxury Fleet",
    category: "Transportation",
    location: "Fateh Sagar, Udaipur, Rajasthan",
    city: "Udaipur",
    latitude: 24.591,
    longitude: 73.679,
    serviceRadiusKm: 100,
    rating: 4.98,
    reviewsCount: 88,
    verified: true,
    isDemo: false,
    basePrice: 26000,
    originalPriceInr: 32000,
    hasActiveDiscount: true,
    discountBadge: "FLAT ₹6,000 OFF",
    discountPercent: 18,
    coverImage: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80",
    description: "Chauffeur-driven classic open-top vintage cars, flower-decorated convertibles for groom baraats, and luxury Mercedes/BMW bridal arrival sedans.",
    tags: ["Vintage Convertible", "Groom Baraat", "Rolls Royce Look", "Flat ₹6,000 Off", "Decorated Fleet"],
  },
  {
    id: "vnd_vintage_wheels",
    businessName: "Heritage Vintage Wedding Cars",
    category: "Transportation",
    location: "Paldi, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    latitude: 23.013,
    longitude: 72.562,
    serviceRadiusKm: 150,
    rating: 4.97,
    reviewsCount: 42,
    verified: true,
    isDemo: false,
    basePrice: 28000,
    originalPriceInr: 32000,
    hasActiveDiscount: true,
    discountBadge: "12% OFF",
    discountPercent: 12,
    coverImage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80",
    description: "Classic open-top vintage convertibles and bridal sedans for grand baraats and vidai ceremonies.",
    tags: ["Vintage Convertible", "Chauffeur Driven", "Baraat Car", "Decorated"],
  },

  // --- 10. CHOREOGRAPHY & EMCEE ---
  {
    id: "vnd_udaipur_sangeet_dance",
    businessName: "Natraj Royal Sangeet Dance & Emcees",
    category: "Choreography",
    location: "Subhash Nagar, Udaipur, Rajasthan",
    city: "Udaipur",
    latitude: 24.585,
    longitude: 73.702,
    serviceRadiusKm: 120,
    rating: 4.97,
    reviewsCount: 76,
    verified: true,
    isDemo: false,
    basePrice: 24000,
    originalPriceInr: 30000,
    hasActiveDiscount: true,
    discountBadge: "20% SANGEET OFFER",
    discountPercent: 20,
    coverImage: "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=600&q=80",
    description: "Celebrity sangeet choreographers, customized bride-groom romantic entry dance training, family flash mobs, and bilingual celebrity anchors/emcees.",
    tags: ["Couple Dance", "Family Flashmob", "Celebrity Anchor", "20% Sangeet Offer", "Sangeet Concept"],
  },
  {
    id: "vnd_rhythm_choreography",
    businessName: "StepUp Wedding Choreography & Event Hosts",
    category: "Choreography",
    location: "Bodakdev, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    latitude: 23.042,
    longitude: 72.515,
    serviceRadiusKm: 200,
    rating: 4.94,
    reviewsCount: 68,
    verified: true,
    isDemo: false,
    basePrice: 26000,
    originalPriceInr: 30000,
    hasActiveDiscount: true,
    discountBadge: "15% FESTIVE OFF",
    discountPercent: 15,
    coverImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80",
    description: "Energetic wedding choreography, viral reels concepts, interactive sangeet hosting, and high-energy family routines.",
    tags: ["Bilingual Emcee", "Sangeet Dance", "Viral Reels", "15% Festive Off"],
  },
];

const CITY_COORDINATES = {
  Udaipur: { lat: 24.5854, lng: 73.7125 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  "Delhi NCR": { lat: 28.6139, lng: 77.209 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Goa: { lat: 15.2993, lng: 74.124 },
};

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getVendorDistanceInfo(vendor, selectedCity) {
  if (!selectedCity || selectedCity === "all") {
    return {
      distanceKm: 3.5,
      distanceText: "Local & Destination Service",
    };
  }

  const targetCoord = CITY_COORDINATES[selectedCity];
  const vendorCity = vendor.city || "";
  const isSameCity =
    vendorCity.toLowerCase() === selectedCity.toLowerCase() ||
    (vendor.location && vendor.location.toLowerCase().includes(selectedCity.toLowerCase()));

  if (isSameCity) {
    if (vendor.latitude && vendor.longitude && targetCoord) {
      const d = calculateDistanceKm(targetCoord.lat, targetCoord.lng, vendor.latitude, vendor.longitude);
      const km = Math.max(1.2, Number((d || 3.2).toFixed(1)));
      return {
        distanceKm: km,
        distanceText: `${km} km away`,
      };
    }
    const hash = (vendor.id || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const km = Number((1.8 + (hash % 50) * 0.1).toFixed(1));
    return {
      distanceKm: km,
      distanceText: `${km} km away`,
    };
  }

  if (vendor.latitude && vendor.longitude && targetCoord) {
    const d = calculateDistanceKm(targetCoord.lat, targetCoord.lng, vendor.latitude, vendor.longitude);
    const km = Math.round(d || 180);
    return {
      distanceKm: km,
      distanceText: `${km} km • Serves ${selectedCity}`,
    };
  }

  return {
    distanceKm: 50,
    distanceText: `Serves ${selectedCity} & Outstation`,
  };
}

// Token stemmer for matching plurals (photographers -> photograph, caterers -> cater, etc.)
function stemWord(word) {
  let w = String(word || "").toLowerCase();
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("es")) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  if (w.endsWith("ing")) return w.slice(0, -3);
  if (w.endsWith("ers")) return w.slice(0, -3);
  if (w.endsWith("er")) return w.slice(0, -2);
  if (w.endsWith("ors")) return w.slice(0, -3);
  if (w.endsWith("or")) return w.slice(0, -2);
  return w;
}

function filterVendorsList(allVendors, { query, category, location }) {
  let list = allVendors;

  // 1. Category filter
  if (category && category !== "all") {
    const catNorm = category.toLowerCase().trim();
    list = list.filter((v) => {
      const vc = (v.category || "").toLowerCase();
      const tags = (v.tags || []).map((t) => t.toLowerCase()).join(" ");
      const combined = `${vc} ${tags} ${v.description.toLowerCase()}`;

      if (catNorm.includes("cater") || catNorm.includes("cook")) {
        return combined.includes("cater") || combined.includes("cook") || combined.includes("buffet") || combined.includes("food");
      }
      if (catNorm.includes("photo") || catNorm.includes("video")) {
        return combined.includes("photo") || combined.includes("video") || combined.includes("candid") || combined.includes("drone");
      }
      if (catNorm.includes("dj") || catNorm.includes("music")) {
        return combined.includes("dj") || combined.includes("music") || combined.includes("sound") || combined.includes("dhol");
      }
      if (catNorm.includes("decor") || catNorm.includes("balloon")) {
        return combined.includes("decor") || combined.includes("balloon") || combined.includes("mandap") || combined.includes("stage") || combined.includes("floral");
      }
      if (catNorm.includes("makeup") || catNorm.includes("beauty")) {
        return combined.includes("makeup") || combined.includes("beauty") || combined.includes("bridal") || combined.includes("salon");
      }
      if (catNorm.includes("mehndi") || catNorm.includes("henna")) {
        return combined.includes("mehndi") || combined.includes("mehendi") || combined.includes("henna");
      }
      if (catNorm.includes("light")) {
        return combined.includes("light") || combined.includes("led") || combined.includes("effects") || combined.includes("truss");
      }
      if (catNorm.includes("tent") || catNorm.includes("setup")) {
        return combined.includes("tent") || combined.includes("pagoda") || combined.includes("shamiana") || combined.includes("marquee") || combined.includes("setup");
      }
      if (catNorm.includes("transport") || catNorm.includes("car")) {
        return combined.includes("transport") || combined.includes("car") || combined.includes("vintage") || combined.includes("coach") || combined.includes("fleet");
      }
      if (catNorm.includes("choreo") || catNorm.includes("emcee") || catNorm.includes("dance")) {
        return combined.includes("choreo") || combined.includes("emcee") || combined.includes("dance") || combined.includes("host") || combined.includes("sangeet");
      }

      return vc.includes(catNorm) || catNorm.includes(vc) || combined.includes(catNorm);
    });
  }

  // 2. Keyword Search Query Filter
  if (query && query.trim()) {
    const rawQ = query.trim().toLowerCase();
    const tokens = rawQ.split(/[\s,+/]+/).filter(Boolean);

    list = list.filter((v) => {
      const haystack = [
        v.businessName,
        v.category,
        v.description,
        v.location,
        v.city,
        ...(v.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      // Direct match
      if (haystack.includes(rawQ)) return true;

      // Stemmed matching
      const stems = tokens.map(stemWord);
      const allMatch = tokens.every((tok, idx) => {
        const s = stems[idx];
        return haystack.includes(tok) || haystack.includes(s);
      });
      if (allMatch) return true;

      const anyMatch = tokens.some((tok, idx) => {
        const s = stems[idx];
        return haystack.includes(tok) || (s.length >= 3 && haystack.includes(s));
      });
      return anyMatch;
    });
  }

  // 3. Location Filter
  if (location && location !== "all") {
    const locNorm = location.toLowerCase().trim();
    const localVendors = list.filter((v) => {
      const vCity = (v.city || "").toLowerCase();
      const vLoc = (v.location || "").toLowerCase();
      return vCity.includes(locNorm) || vLoc.includes(locNorm);
    });

    if (localVendors.length > 0) {
      // Prioritize local vendors; if fewer than 3, add regional destination vendors
      const otherVendors = list.filter((v) => !localVendors.includes(v));
      list = [...localVendors, ...otherVendors];
    }
  }

  return list;
}

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
  initialCategory = "all",
  initialLocation = "all",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "all");
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || "all");

  useEffect(() => {
    if (initialCategory && initialCategory !== "all") {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (initialLocation && initialLocation !== "all") {
      setSelectedLocation(initialLocation);
    }
  }, [initialLocation]);
  const [vendors, setVendors] = useState(() => {
    return CURATED_DEFAULT_VENDORS.map((v) => {
      const d = getVendorDistanceInfo(v, "all");
      return { ...v, distanceKm: d.distanceKm, distanceText: d.distanceText };
    });
  });
  const [isLoading, setIsLoading] = useState(false);
  const [totalMatches, setTotalMatches] = useState(CURATED_DEFAULT_VENDORS.length);

  // Modals state
  const [selectedVendorForModal, setSelectedVendorForModal] = useState(null);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [notifyModalContext, setNotifyModalContext] = useState(null);

  // Smooth scroll to vendor section
  const scrollToVendors = useCallback(() => {
    setTimeout(() => {
      const el = document.getElementById("marketplace-vendors-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  }, []);

  // Local Wishlist storage
  const [wishlistIds, setWishlistIds] = useState(() => {
    try {
      const saved = localStorage.getItem("bookme_wishlist_ids");
      return saved ? JSON.parse(saved) : ["vnd_udaipur_mewari_caterers", "vnd_sunset_caterers"];
    } catch {
      return ["vnd_udaipur_mewari_caterers", "vnd_sunset_caterers"];
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

  // Fetch vendors from live backend or fallback to rich canonical database
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

          if (isMounted && res && Array.isArray(res.items) && res.items.length > 0) {
            const merged = res.items.map((item, idx) => {
              const fallback = CURATED_DEFAULT_VENDORS[idx % CURATED_DEFAULT_VENDORS.length];
              const dist = getVendorDistanceInfo(item, selectedLocation);
              return {
                ...item,
                id: item.id || fallback.id,
                businessName: item.businessName || fallback.businessName,
                category: item.category || fallback.category,
                location: item.location || fallback.location,
                city: item.city || fallback.city,
                rating: item.rating ? parseFloat(item.rating) : fallback.rating,
                reviewsCount: item.reviewCount ?? fallback.reviewsCount,
                verified: Boolean(item.verified ?? fallback.verified),
                isDemo: Boolean(item.isDemo),
                basePrice: item.startingPriceInr ?? fallback.basePrice,
                originalPriceInr: item.originalPriceInr ?? fallback.originalPriceInr,
                coverImage: item.photoUrl || fallback.coverImage,
                description: item.description || fallback.description,
                tags:
                  item.categories?.length > 0
                    ? item.categories.map((c) => c.name)
                    : fallback.tags,
                hasActiveDiscount: Boolean(item.hasActiveDiscount ?? fallback.hasActiveDiscount),
                discountBadge: item.discountBadge || fallback.discountBadge,
                discountPercent: item.discountPercent || fallback.discountPercent,
                distanceKm: item.distanceKm ?? dist.distanceKm,
                distanceText: item.distanceText || dist.distanceText,
              };
            });

            setVendors(merged);
            setTotalMatches(res.totalItems !== undefined ? res.totalItems : merged.length);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to local filtering
      }

      if (isMounted) {
        const filtered = filterVendorsList(CURATED_DEFAULT_VENDORS, {
          query: searchQuery,
          category: selectedCategory,
          location: selectedLocation,
        });

        // Enrich with dynamic distance based on selected city
        const enriched = filtered.map((v) => {
          const dist = getVendorDistanceInfo(v, selectedLocation);
          return {
            ...v,
            distanceKm: dist.distanceKm,
            distanceText: dist.distanceText,
          };
        });

        setVendors(enriched);
        setTotalMatches(enriched.length);
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
          onClick={() => {
            setSelectedCategory("all");
            scrollToVendors();
          }}
        >
          Explore All Verified Vendors →
        </button>
      </div>

      {/* Main Header Bar */}
      <MarketplaceHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={(q) => {
          setSearchQuery(q);
          scrollToVendors();
        }}
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
        vendors={vendors}
        onSelectVendor={(v) => setSelectedVendorForModal(v)}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          scrollToVendors();
        }}
      />

      {/* Hero Section */}
      <MarketplaceHero
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onKeywordSearchSubmit={(q) => {
          setSearchQuery(q);
          scrollToVendors();
        }}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        onSearchSubmit={({ eventType, location }) => {
          if (location && location !== "all") setSelectedLocation(location);
          if (eventType === "wedding") setSelectedCategory("Photography");
          else if (eventType === "birthday") setSelectedCategory("DJ & Music");
          else if (eventType === "corporate") setSelectedCategory("Catering");
          else if (eventType === "sangeet") setSelectedCategory("Choreography");
          else if (eventType === "reception") setSelectedCategory("Catering");
          else if (eventType === "festival") setSelectedCategory("Decoration");
          else setSelectedCategory("all");
          scrollToVendors();
        }}
      />

      {/* Service Categories Quick-Nav Bar & Visual Grid */}
      <MarketplaceCategories
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          scrollToVendors();
        }}
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
