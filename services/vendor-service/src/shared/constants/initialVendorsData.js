/**
 * Canonical Seed Dataset: 60+ Distinct, KYC-Verified, Active Vendors
 * Covering all 60 SRS Service Categories across major Indian cities
 * (Ahmedabad, Mumbai, Delhi NCR, Bengaluru, Jaipur, Pune, Surat, Udaipur, Goa, Hyderabad)
 */

const { SERVICE_CATEGORIES } = require('./categoriesData');

const INDIAN_CITIES_MAP = {
  Ahmedabad: { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  Mumbai: { city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  Delhi: { city: 'Delhi', state: 'Delhi NCR', lat: 28.6139, lng: 77.209 },
  Bengaluru: { city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  Jaipur: { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  Pune: { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  Surat: { city: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  Udaipur: { city: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125 },
  Goa: { city: 'Goa', state: 'Goa', lat: 15.2993, lng: 74.124 },
  Hyderabad: { city: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
};

const CITY_ROTATION = [
  'Ahmedabad', 'Mumbai', 'Ahmedabad', 'Delhi', 'Bengaluru',
  'Ahmedabad', 'Jaipur', 'Pune', 'Ahmedabad', 'Surat',
  'Udaipur', 'Goa', 'Hyderabad', 'Ahmedabad', 'Mumbai',
];

const VENDOR_BRANDS = [
  { prefix: 'Royal', suffix: 'Creations & Studios' },
  { prefix: 'Shree Krishna', suffix: 'Events & Co.' },
  { prefix: 'Aarambh', suffix: 'Weddings & Productions' },
  { prefix: 'Vivaah', suffix: 'Symphony & Decors' },
  { prefix: 'Kalyani', suffix: 'Heritage Specialists' },
  { prefix: 'Utsav', suffix: 'Celebration Collective' },
  { prefix: 'Darbar', suffix: 'Artisans & Hospitality' },
  { prefix: 'Swastik', suffix: 'Production House' },
  { prefix: 'Mangalam', suffix: 'Enterprises' },
  { prefix: 'Navrang', suffix: 'Designs & Services' },
];

function buildCanonicalVendorsData() {
  const now = new Date();
  const vendors = [];
  const vendorCategories = [];
  const services = [];
  const packages = [];

  // 1. Original 4 legacy vendors preserved for backwards compatibility
  vendors.push(
    {
      id: 'vnd_sunset_caterers',
      user_id: 'usr_sunset_01',
      business_name: 'Sunset Royal Caterers & Event Crafters',
      category: 'catering',
      description:
        'Specialized in royal destination wedding buffets, multi-cuisine live counters, and artisanal mocktail lounges.',
      photo_url: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80',
      location: 'SG Highway, Ahmedabad, India',
      address: 'SG Highway, Ahmedabad, Gujarat',
      latitude: 23.033863,
      longitude: 72.507423,
      service_radius_km: 50,
      service_areas: ['Ahmedabad', 'Gandhinagar'],
      verified: true,
      kyc_status: 'APPROVED',
      agreement_version: 'v1.0',
      agreement_signed_at: now,
      rating: 4.96,
      review_count: 42,
      is_featured: true,
      is_demo: false,
      violation_count: 0,
      preferred_language: 'en',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'vnd_dream_clicks',
      user_id: 'usr_dream_02',
      business_name: 'Dream Clicks Cinematic Studio',
      category: 'photography',
      description:
        'Award-winning candid wedding storytellers, cinematic 4K highlight reels, drone aerial shoots.',
      photo_url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=600&q=80',
      location: 'Vastrapur, Ahmedabad, India',
      address: 'Vastrapur, Ahmedabad, Gujarat',
      latitude: 23.035001,
      longitude: 72.529324,
      service_radius_km: 100,
      service_areas: ['Ahmedabad', 'Udaipur', 'Mumbai'],
      verified: true,
      kyc_status: 'APPROVED',
      agreement_version: 'v1.0',
      agreement_signed_at: now,
      rating: 4.9,
      review_count: 38,
      is_featured: true,
      is_demo: false,
      violation_count: 0,
      preferred_language: 'en',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'vnd_aura_decors',
      user_id: 'usr_aura_03',
      business_name: 'Aura Luxury Stage & Floral Decors',
      category: 'decoration',
      description:
        'Grand entrance floral arches, dynamic LED tunnel stages, and royal wedding mandap setups.',
      photo_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80',
      location: 'Bodakdev, Ahmedabad, India',
      address: 'Bodakdev, Ahmedabad, Gujarat',
      latitude: 23.040212,
      longitude: 72.511891,
      service_radius_km: 60,
      service_areas: ['Ahmedabad'],
      verified: true,
      kyc_status: 'APPROVED',
      agreement_version: 'v1.0',
      agreement_signed_at: now,
      rating: 4.85,
      review_count: 29,
      is_featured: false,
      is_demo: false,
      violation_count: 0,
      preferred_language: 'en',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'vnd_electra_dj',
      user_id: 'usr_electra_04',
      business_name: 'Electra DJ & Sound Innovations',
      category: 'dj',
      description:
        'High-energy club DJ setups, celebrity sangeet nights, JBL line array sound & intelligent CO2 fog jets.',
      photo_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
      location: 'Prahlad Nagar, Ahmedabad, India',
      address: 'Prahlad Nagar, Ahmedabad, Gujarat',
      latitude: 23.012034,
      longitude: 72.510754,
      service_radius_km: 80,
      service_areas: ['Ahmedabad'],
      verified: true,
      kyc_status: 'APPROVED',
      agreement_version: 'v1.0',
      agreement_signed_at: now,
      rating: 4.95,
      review_count: 54,
      is_featured: false,
      is_demo: false,
      violation_count: 0,
      preferred_language: 'en',
      created_at: now,
      updated_at: now,
    }
  );

  vendorCategories.push(
    { vendor_id: 'vnd_sunset_caterers', category_id: 'cat_09_caterer', is_primary: true },
    { vendor_id: 'vnd_sunset_caterers', category_id: 'cat_12_live_food_counter', is_primary: false },
    { vendor_id: 'vnd_dream_clicks', category_id: 'cat_01_wedding_photographer', is_primary: true },
    { vendor_id: 'vnd_dream_clicks', category_id: 'cat_02_candid_photographer', is_primary: false },
    { vendor_id: 'vnd_aura_decors', category_id: 'cat_17_wedding_decorator', is_primary: true },
    { vendor_id: 'vnd_electra_dj', category_id: 'cat_25_dj', is_primary: true }
  );

  services.push(
    {
      id: 'svc_royal_buffet',
      vendor_id: 'vnd_sunset_caterers',
      category_id: 'cat_09_caterer',
      title: 'Signature Royal Wedding Multi-Cuisine Feast',
      description: '4 Starters, 6 Main Course, Dal Makhani, Paneer Tikka Masala, Dum Biryani & 3 Desserts',
      base_price: 45000,
      base_price_paise: 4500000n,
      is_active: true,
      created_at: now,
    },
    {
      id: 'svc_live_chaat',
      vendor_id: 'vnd_sunset_caterers',
      category_id: 'cat_12_live_food_counter',
      title: 'Live Delhi Chaat & Street Food Counter',
      description: 'Pani Puri, Dahi Bhalla, Sev Puri & Aloo Tikki with 2 Dedicated Chefs',
      base_price: 15000,
      base_price_paise: 1500000n,
      is_active: true,
      created_at: now,
    },
    {
      id: 'svc_candid_photo',
      vendor_id: 'vnd_dream_clicks',
      category_id: 'cat_02_candid_photographer',
      title: 'Full Day Candid Wedding Shoot & 4K Cinema',
      description: '2 Photographers + 1 Cinematographer + Drone Aerial Coverage',
      base_price: 55000,
      base_price_paise: 5500000n,
      is_active: true,
      created_at: now,
    },
    {
      id: 'svc_mandap_decor',
      vendor_id: 'vnd_aura_decors',
      category_id: 'cat_17_wedding_decorator',
      title: 'Royal Floral Mandap & Stage Architectural Setup',
      description: 'Imported Carnations, Marigold Tunnel, Ambient Uplighting & Royal Sofas',
      base_price: 65000,
      base_price_paise: 6500000n,
      is_active: true,
      created_at: now,
    },
    {
      id: 'svc_sangeet_dj',
      vendor_id: 'vnd_electra_dj',
      category_id: 'cat_25_dj',
      title: 'Grand Wedding Sangeet Club Audio & Light Production',
      description: 'JBL VRX Line Array, Intelligent Sharpy Beams & Cold Pyro Sparks',
      base_price: 35000,
      base_price_paise: 3500000n,
      is_active: true,
      created_at: now,
    }
  );

  packages.push(
    {
      id: 'pkg_royal_buffet',
      vendor_id: 'vnd_sunset_caterers',
      category_id: 'cat_09_caterer',
      name: 'Signature 5-Course Royal Wedding Buffet',
      tier: 'Premium',
      description: 'Complete royal wedding catering buffet package with live counters and dedicated beverage lounge.',
      service_ids: ['svc_royal_buffet', 'svc_live_chaat'],
      price: 45000,
      base_price_paise: 4500000,
      price_unit: 'PER_DAY',
      pricing_unit: 'per_day',
      inclusions: ['4 Welcome Drinks', '4 Starters', '6 Main Courses', '3 Live Counters', 'Dessert Buffet'],
      exclusions: ['Outstation transport outside 50km'],
      brand_attributes: {},
      min_guests: 100,
      max_guests: 1500,
      duration_hours: 8,
      overtime_rate_paise: 250000,
      total_capacity_units: 3,
      capacity_units: 3,
      security_deposit_paise: 500000,
      gst_rate_bps: 500,
      gst_rate_percent: 5,
      hsn_sac_code: '996331',
      tax_inclusive: false,
      is_tax_inclusive: false,
      cancellation_policy: 'MODERATE',
      status: 'PUBLISHED',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'pkg_platinum_photo',
      vendor_id: 'vnd_dream_clicks',
      category_id: 'cat_01_wedding_photographer',
      name: 'Platinum Wedding Cinema & Drone Package',
      tier: 'Premium',
      description: 'Full-day candid photography, cinematography, and aerial drone coverage with 4K color-graded film.',
      service_ids: ['svc_candid_photo'],
      price: 95000,
      base_price_paise: 9500000,
      price_unit: 'PER_DAY',
      pricing_unit: 'per_day',
      inclusions: ['2 Candid Photographers', '2 Cinematographers', '1 DGCA Drone Pilot', 'Handcrafted 40-Page Album'],
      exclusions: ['Destination airfare outside Gujarat'],
      brand_attributes: {},
      min_guests: 50,
      max_guests: 1000,
      duration_hours: 10,
      overtime_rate_paise: 500000,
      total_capacity_units: 2,
      capacity_units: 2,
      security_deposit_paise: 1000000,
      gst_rate_bps: 1800,
      gst_rate_percent: 18,
      hsn_sac_code: '998386',
      tax_inclusive: false,
      is_tax_inclusive: false,
      cancellation_policy: 'MODERATE',
      status: 'PUBLISHED',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'pkg_mandap_decor',
      vendor_id: 'vnd_aura_decors',
      category_id: 'cat_17_wedding_decorator',
      name: 'Grand Royal Mandap & Stage Floral Setup',
      tier: 'Premium',
      description: 'Architectural fresh floral mandap with havan canopy, entrance arches, and Maharaja chairs.',
      service_ids: ['svc_mandap_decor'],
      price: 65000,
      base_price_paise: 6500000,
      price_unit: 'PER_DAY',
      pricing_unit: 'per_day',
      inclusions: ['Fresh Marigold & Orchid Canopy', 'Entrance Floral Arch', 'Stage Backdrop', '2 Maharaja Chairs'],
      exclusions: [],
      brand_attributes: {},
      min_guests: 100,
      max_guests: 2000,
      duration_hours: 12,
      overtime_rate_paise: 300000,
      total_capacity_units: 2,
      capacity_units: 2,
      security_deposit_paise: 500000,
      gst_rate_bps: 1800,
      gst_rate_percent: 18,
      hsn_sac_code: '998596',
      tax_inclusive: false,
      is_tax_inclusive: false,
      cancellation_policy: 'MODERATE',
      status: 'PUBLISHED',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'pkg_sangeet_dj',
      vendor_id: 'vnd_electra_dj',
      category_id: 'cat_25_dj',
      name: 'High-Octane Sangeet DJ & Fog Pyro Experience',
      tier: 'Premium',
      description: 'Concert-grade sound setup with live remix console, moving heads, cold spark machines, and CO2 jets.',
      service_ids: ['svc_sangeet_dj'],
      price: 35000,
      base_price_paise: 3500000,
      price_unit: 'PER_DAY',
      pricing_unit: 'per_day',
      inclusions: ['JBL Line Array System', 'Intelligent LED Moving Heads', '4 Cold Spark Fountains', 'DJ + Emcee Console'],
      exclusions: ['Sound curfew extension past 10 PM'],
      brand_attributes: {},
      min_guests: 50,
      max_guests: 800,
      duration_hours: 6,
      overtime_rate_paise: 200000,
      total_capacity_units: 2,
      capacity_units: 2,
      security_deposit_paise: 500000,
      gst_rate_bps: 1800,
      gst_rate_percent: 18,
      hsn_sac_code: '999614',
      tax_inclusive: false,
      is_tax_inclusive: false,
      cancellation_policy: 'MODERATE',
      status: 'PUBLISHED',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }
  );

  // 2. Build 60 distinct verified canonical vendors (one primary for each SRS service category)
  SERVICE_CATEGORIES.forEach((cat, index) => {
    const num = String(index + 1).padStart(2, '0');
    const vendorId = `vnd_canon_${num}`;
    const userId = `usr_canon_${num}`;

    const cityName = CITY_ROTATION[index % CITY_ROTATION.length];
    const cityMeta = INDIAN_CITIES_MAP[cityName] || INDIAN_CITIES_MAP.Ahmedabad;
    const brand = VENDOR_BRANDS[index % VENDOR_BRANDS.length];
    const businessName = `${brand.prefix} ${cat.name} ${brand.suffix}`;

    const latOffset = (((index % 7) - 3) * 0.005);
    const lngOffset = (((index % 9) - 4) * 0.005);
    const lat = Number((cityMeta.lat + latOffset).toFixed(6));
    const lng = Number((cityMeta.lng + lngOffset).toFixed(6));

    const baseInr = 18000 + ((index * 2300) % 75000);
    const basePaise = BigInt(baseInr * 100);
    const gstRatePercent = cat.defaultGstRatePercent || 18;
    const gstBps = gstRatePercent * 100;
    const priceUnit = cat.parentId === 'cat_parent_food' ? 'PER_PLATE' : 'PER_DAY';

    const CATEGORY_KEYWORDS = {
      cat_01_wedding_photographer: 'wedding photographer, candid photography, wedding shoot, cinematic film',
      cat_02_candid_photographer: 'candid photographer, emotional moments, candid wedding portraits',
      cat_03_pre_wedding_photographer: 'pre-wedding shoot, destination pre-wedding, couple portraits',
      cat_06_drone_videography: 'drone videography, 4k aerial drone shots, dgca compliant',
      cat_09_caterer: 'caterer, royal buffet, multi-cuisine wedding catering, dal makhani, biryani',
      cat_10_vegetarian_caterer: 'pure vegetarian caterer, jain catering, marwari gujarati buffet',
      cat_12_live_food_counter: 'live chaat, delhi chaat, pani puri, live dosa, street food counter, pav bhaji',
      cat_13_sweets_and_desserts: 'mithai, gulab jamun, jalebi rabdi, artisanal desserts, wedding sweets',
      cat_14_wedding_cake_maker: 'wedding cake, designer multi-tier cakes, fondant celebration cake',
      cat_17_wedding_decorator: 'wedding decorator, floral mandap, grand reception stage, theme decors',
      cat_18_mandap_decorator: 'mandap decorator, royal wedding mandap, fresh marigold and orchid canopy',
      cat_19_stage_decorator: 'stage decorator, led tunnel stage, backdrop flowers, royal sofas',
      cat_20_balloon_decorator: 'balloon decorator, helium balloons, birthday anniversary setup',
      cat_25_dj: 'dj, sangeet dj, sound console, line array sound, club dj, cold spark pyro',
      cat_26_live_band: 'live band, acoustic wedding band, sufi music, fusion musical ensemble',
      cat_29_dhol_group: 'dhol group, punjabi dhol, baraat dhol troupe, nasik dhol',
      cat_33_bridal_makeup_artist: 'bridal makeup artist, hd airbrush makeup, celebrity bridal makeover, hair styling',
      cat_34_party_makeup_artist: 'party makeup artist, bridesmaid makeup, cocktail party glow',
      cat_36_mehndi_artist: 'mehndi artist, bridal henna, rajasthani mehndi, marwari arabic mehndi design',
      cat_39_lighting_vendor: 'lighting vendor, ambient led wash, truss lighting, fairy lights',
      cat_42_tent_provider: 'tent provider, german pagoda, ac shamiana, waterproof marquees, tents',
      cat_47_wedding_car_rental: 'wedding car rental, vintage baraat car, luxury bridal convertible, chauffeur driven',
      cat_48_luxury_car_rental: 'luxury car rental, mercedes, audi, bmw wedding cars',
      cat_49_guest_bus: 'guest bus, luxury ac coach, wedding guest transport',
      cat_53_wedding_planner: 'wedding planner, destination wedding planner, budget management, coordination',
      cat_57_priest_ceremonial_services: 'priest, pandit, vedic wedding rituals, purohit ceremony',
      cat_58_security_staff: 'security staff, event bouncers, crowd control, psara licensed security',
    };

    const extraKeywords = CATEGORY_KEYWORDS[cat.id] || '';

    vendors.push({
      id: vendorId,
      user_id: userId,
      business_name: businessName,
      category: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: `Premium verified ${cat.name} professional based in ${cityName}, ${cityMeta.state}. High-touch customer service, verified background check, and seamless milestone fulfillment. ${extraKeywords}. ${cat.complianceNote || ''}`,
      photo_url: null,
      location: `${cityName}, ${cityMeta.state}`,
      address: `Civil Lines & Main Avenue, ${cityName}`,
      latitude: lat,
      longitude: lng,
      service_radius_km: 40 + ((index * 5) % 60),
      service_areas: [cityName, 'Nearby Districts'],
      verified: true, // Fully verified base vendor
      kyc_status: 'APPROVED',
      agreement_version: 'v1.0',
      agreement_signed_at: now,
      rating: Number((4.75 + ((index % 25) * 0.01)).toFixed(2)),
      review_count: 24 + ((index * 3) % 80),
      is_featured: index % 6 === 0,
      is_demo: false, // Canonical verified vendors for live customer search
      violation_count: 0,
      preferred_language: index % 4 === 0 ? 'hi' : index % 5 === 0 ? 'gu' : 'en',
      created_at: now,
      updated_at: now,
    });

    vendorCategories.push({
      vendor_id: vendorId,
      category_id: cat.id,
      is_primary: true,
    });

    // Associated service
    const svcId = `svc_canon_${num}`;
    services.push({
      id: svcId,
      vendor_id: vendorId,
      category_id: cat.id,
      title: `${cat.name} — Signature Service Experience`,
      description: `Comprehensive ${cat.name.toLowerCase()} deliverable customized for premium Indian celebrations. Specializing in ${extraKeywords || cat.name}.`,
      base_price: baseInr,
      base_price_paise: basePaise,
      is_active: true,
      created_at: now,
    });

    // Associated published package
    const pkgId = `pkg_canon_${num}`;
    packages.push({
      id: pkgId,
      vendor_id: vendorId,
      category_id: cat.id,
      name: `${cat.name} Premium Package`,
      tier: 'Premium',
      description: `Includes full-service professional setup, trained crew, transparent integer paise pricing, and 40% escrow payment protection. Deliverables: ${extraKeywords || cat.name}.`,
      service_ids: [svcId],
      price: baseInr,
      base_price_paise: Number(basePaise),
      price_unit: priceUnit,
      pricing_unit: priceUnit.toLowerCase(),
      inclusions: [
        `Complete ${cat.name} deliverable`,
        'Professional on-site coordination',
        'Standard equipment & safety compliance',
      ],
      exclusions: ['Outstation travel beyond service radius'],
      brand_attributes: { canonical: true, verifiedPartner: true },
      min_guests: priceUnit === 'PER_PLATE' ? 50 : 1,
      max_guests: priceUnit === 'PER_PLATE' ? 1200 : 500,
      duration_hours: 8,
      overtime_rate_paise: 250000,
      total_capacity_units: 2,
      capacity_units: 2,
      security_deposit_paise: 500000,
      gst_rate_bps: gstBps,
      gst_rate_percent: gstRatePercent,
      hsn_sac_code: cat.defaultHsnSac || '998596',
      tax_inclusive: false,
      is_tax_inclusive: false,
      cancellation_policy: 'MODERATE',
      status: 'PUBLISHED',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  });

  return {
    vendors,
    vendorCategories,
    services,
    packages,
  };
}

module.exports = {
  buildCanonicalVendorsData,
};
