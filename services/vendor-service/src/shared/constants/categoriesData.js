/**
 * Canonical 60 Service Categories across 8 Parent Domains (SRS Section 4 & FR-VEN-01)
 * Data-driven hierarchy seeded into PostgreSQL `categories` table and in-memory store.
 */

const PARENT_CATEGORIES = [
  {
    id: 'cat_parent_photography',
    name: 'Photography and media',
    slug: 'photography',
    parentId: null,
    isRegulated: false,
    complianceNote: null,
    defaultHsnSac: '998386',
    defaultGstRatePercent: 18,
  },
  {
    id: 'cat_parent_food',
    name: 'Food and hospitality',
    slug: 'catering',
    parentId: null,
    isRegulated: true,
    complianceNote: 'Requires valid FSSAI Food Safety registration/license.',
    defaultHsnSac: '996331',
    defaultGstRatePercent: 5,
  },
  {
    id: 'cat_parent_decoration',
    name: 'Decoration and setup',
    slug: 'decoration',
    parentId: null,
    isRegulated: false,
    complianceNote: null,
    defaultHsnSac: '998596',
    defaultGstRatePercent: 18,
  },
  {
    id: 'cat_parent_music',
    name: 'Music and entertainment',
    slug: 'dj',
    parentId: null,
    isRegulated: false,
    complianceNote: null,
    defaultHsnSac: '999614',
    defaultGstRatePercent: 18,
  },
  {
    id: 'cat_parent_beauty',
    name: 'Beauty and styling',
    slug: 'beauty',
    parentId: null,
    isRegulated: false,
    complianceNote: null,
    defaultHsnSac: '999722',
    defaultGstRatePercent: 18,
  },
  {
    id: 'cat_parent_infrastructure',
    name: 'Infrastructure',
    slug: 'infrastructure',
    parentId: null,
    isRegulated: false,
    complianceNote: null,
    defaultHsnSac: '997319',
    defaultGstRatePercent: 18,
  },
  {
    id: 'cat_parent_transport',
    name: 'Transport and logistics',
    slug: 'transport',
    parentId: null,
    isRegulated: true,
    complianceNote: 'Requires valid commercial vehicle permit, fitness certificate, and insurance.',
    defaultHsnSac: '996601',
    defaultGstRatePercent: 5,
  },
  {
    id: 'cat_parent_planning',
    name: 'Planning and special services',
    slug: 'planning',
    parentId: null,
    isRegulated: false,
    complianceNote: null,
    defaultHsnSac: '998596',
    defaultGstRatePercent: 18,
  },
];

const SERVICE_CATEGORIES = [
  // 1-8: Photography and media
  { id: 'cat_01_wedding_photographer', name: 'Wedding Photographer', slug: 'wedding-photographer', parentId: 'cat_parent_photography', isRegulated: false, complianceNote: null, defaultHsnSac: '998386', defaultGstRatePercent: 18 },
  { id: 'cat_02_candid_photographer', name: 'Candid Photographer', slug: 'candid-photographer', parentId: 'cat_parent_photography', isRegulated: false, complianceNote: null, defaultHsnSac: '998386', defaultGstRatePercent: 18 },
  { id: 'cat_03_pre_wedding_photographer', name: 'Pre-Wedding Photographer', slug: 'pre-wedding-photographer', parentId: 'cat_parent_photography', isRegulated: false, complianceNote: null, defaultHsnSac: '998386', defaultGstRatePercent: 18 },
  { id: 'cat_04_videographer', name: 'Videographer', slug: 'videographer', parentId: 'cat_parent_photography', isRegulated: false, complianceNote: null, defaultHsnSac: '998386', defaultGstRatePercent: 18 },
  { id: 'cat_05_cinematic_filmmaker', name: 'Cinematic Filmmaker', slug: 'cinematic-filmmaker', parentId: 'cat_parent_photography', isRegulated: false, complianceNote: null, defaultHsnSac: '998386', defaultGstRatePercent: 18 },
  { id: 'cat_06_drone_videography', name: 'Drone Videography', slug: 'drone-videography', parentId: 'cat_parent_photography', isRegulated: true, complianceNote: 'Requires DGCA DigitalSky UIN registration and airspace permission; prohibited in no-fly zones.', defaultHsnSac: '998386', defaultGstRatePercent: 18 },
  { id: 'cat_07_photo_booth', name: 'Photo Booth', slug: 'photo-booth', parentId: 'cat_parent_photography', isRegulated: false, complianceNote: null, defaultHsnSac: '998386', defaultGstRatePercent: 18 },
  { id: 'cat_08_album_printing', name: 'Album Printing', slug: 'album-printing', parentId: 'cat_parent_photography', isRegulated: false, complianceNote: null, defaultHsnSac: '998912', defaultGstRatePercent: 18 },

  // 9-16: Food and hospitality
  { id: 'cat_09_caterer', name: 'Caterer', slug: 'caterer', parentId: 'cat_parent_food', isRegulated: true, complianceNote: 'Requires valid FSSAI Food Safety license and hygiene compliance.', defaultHsnSac: '996331', defaultGstRatePercent: 5 },
  { id: 'cat_10_vegetarian_caterer', name: 'Vegetarian Caterer', slug: 'vegetarian-caterer', parentId: 'cat_parent_food', isRegulated: true, complianceNote: 'Requires valid FSSAI Food Safety license and strict vegetarian kitchen separation.', defaultHsnSac: '996331', defaultGstRatePercent: 5 },
  { id: 'cat_11_non_vegetarian_caterer', name: 'Non-Vegetarian Caterer', slug: 'non-vegetarian-caterer', parentId: 'cat_parent_food', isRegulated: true, complianceNote: 'Requires valid FSSAI Food Safety license and cold-chain storage compliance.', defaultHsnSac: '996331', defaultGstRatePercent: 5 },
  { id: 'cat_12_live_food_counter', name: 'Live Food Counter', slug: 'live-food-counter', parentId: 'cat_parent_food', isRegulated: true, complianceNote: 'Requires FSSAI compliance and commercial LPG cylinder fire-safety precautions.', defaultHsnSac: '996331', defaultGstRatePercent: 5 },
  { id: 'cat_13_sweets_and_desserts', name: 'Sweets and Desserts', slug: 'sweets-and-desserts', parentId: 'cat_parent_food', isRegulated: true, complianceNote: 'Requires FSSAI certification and batch expiry labelling.', defaultHsnSac: '996331', defaultGstRatePercent: 5 },
  { id: 'cat_14_wedding_cake_maker', name: 'Wedding Cake Maker', slug: 'wedding-cake-maker', parentId: 'cat_parent_food', isRegulated: true, complianceNote: 'Requires FSSAI registration.', defaultHsnSac: '996331', defaultGstRatePercent: 5 },
  { id: 'cat_15_beverage_service', name: 'Beverage Service', slug: 'beverage-service', parentId: 'cat_parent_food', isRegulated: true, complianceNote: 'Non-alcoholic mocktail/beverage service only unless state excise permit is separately held by venue/host.', defaultHsnSac: '996331', defaultGstRatePercent: 5 },
  { id: 'cat_16_waiter_and_hospitality_staff', name: 'Waiter and Hospitality Staff', slug: 'waiter-and-hospitality-staff', parentId: 'cat_parent_food', isRegulated: false, complianceNote: 'Adult workforce compliance (>=18 years) required.', defaultHsnSac: '998519', defaultGstRatePercent: 18 },

  // 17-24: Decoration and setup
  { id: 'cat_17_wedding_decorator', name: 'Wedding Decorator', slug: 'wedding-decorator', parentId: 'cat_parent_decoration', isRegulated: false, complianceNote: null, defaultHsnSac: '998596', defaultGstRatePercent: 18 },
  { id: 'cat_18_mandap_decorator', name: 'Mandap Decorator', slug: 'mandap-decorator', parentId: 'cat_parent_decoration', isRegulated: false, complianceNote: 'Fire-retardant fabric treatment recommended around ceremonial havan/fire.', defaultHsnSac: '998596', defaultGstRatePercent: 18 },
  { id: 'cat_19_stage_decorator', name: 'Stage Decorator', slug: 'stage-decorator', parentId: 'cat_parent_decoration', isRegulated: false, complianceNote: null, defaultHsnSac: '998596', defaultGstRatePercent: 18 },
  { id: 'cat_20_balloon_decorator', name: 'Balloon Decorator', slug: 'balloon-decorator', parentId: 'cat_parent_decoration', isRegulated: true, complianceNote: 'Only non-flammable helium or air allowed; hydrogen gas strictly prohibited.', defaultHsnSac: '998596', defaultGstRatePercent: 18 },
  { id: 'cat_21_floral_decorator', name: 'Floral Decorator', slug: 'floral-decorator', parentId: 'cat_parent_decoration', isRegulated: false, complianceNote: null, defaultHsnSac: '998596', defaultGstRatePercent: 18 },
  { id: 'cat_22_entrance_decoration', name: 'Entrance Decoration', slug: 'entrance-decoration', parentId: 'cat_parent_decoration', isRegulated: false, complianceNote: null, defaultHsnSac: '998596', defaultGstRatePercent: 18 },
  { id: 'cat_23_furniture_rental', name: 'Furniture Rental', slug: 'furniture-rental', parentId: 'cat_parent_decoration', isRegulated: false, complianceNote: null, defaultHsnSac: '997319', defaultGstRatePercent: 18 },
  { id: 'cat_24_event_setup_crew', name: 'Event Setup Crew', slug: 'event-setup-crew', parentId: 'cat_parent_decoration', isRegulated: false, complianceNote: null, defaultHsnSac: '998596', defaultGstRatePercent: 18 },

  // 25-32: Music and entertainment
  { id: 'cat_25_dj', name: 'DJ', slug: 'dj', parentId: 'cat_parent_music', isRegulated: true, complianceNote: 'Must comply with local municipal sound curfew (10:00 PM outdoor deadline) and decibel limits.', defaultHsnSac: '999614', defaultGstRatePercent: 18 },
  { id: 'cat_26_live_band', name: 'Live Band', slug: 'live-band', parentId: 'cat_parent_music', isRegulated: false, complianceNote: null, defaultHsnSac: '999631', defaultGstRatePercent: 18 },
  { id: 'cat_27_singer', name: 'Singer', slug: 'singer', parentId: 'cat_parent_music', isRegulated: false, complianceNote: null, defaultHsnSac: '999631', defaultGstRatePercent: 18 },
  { id: 'cat_28_instrumental_musician', name: 'Instrumental Musician', slug: 'instrumental-musician', parentId: 'cat_parent_music', isRegulated: false, complianceNote: null, defaultHsnSac: '999631', defaultGstRatePercent: 18 },
  { id: 'cat_29_dhol_group', name: 'Dhol Group', slug: 'dhol-group', parentId: 'cat_parent_music', isRegulated: false, complianceNote: null, defaultHsnSac: '999631', defaultGstRatePercent: 18 },
  { id: 'cat_30_anchor_emcee', name: 'Anchor/Emcee', slug: 'anchor-emcee', parentId: 'cat_parent_music', isRegulated: false, complianceNote: null, defaultHsnSac: '999631', defaultGstRatePercent: 18 },
  { id: 'cat_31_dance_troupe', name: 'Dance Troupe', slug: 'dance-troupe', parentId: 'cat_parent_music', isRegulated: false, complianceNote: null, defaultHsnSac: '999631', defaultGstRatePercent: 18 },
  { id: 'cat_32_sound_system_rental', name: 'Sound-System Rental', slug: 'sound-system-rental', parentId: 'cat_parent_music', isRegulated: true, complianceNote: 'Must adhere to CPCB ambient noise standards.', defaultHsnSac: '997319', defaultGstRatePercent: 18 },

  // 33-38: Beauty and styling
  { id: 'cat_33_bridal_makeup_artist', name: 'Bridal Makeup Artist', slug: 'bridal-makeup-artist', parentId: 'cat_parent_beauty', isRegulated: false, complianceNote: null, defaultHsnSac: '999722', defaultGstRatePercent: 18 },
  { id: 'cat_34_party_makeup_artist', name: 'Party Makeup Artist', slug: 'party-makeup-artist', parentId: 'cat_parent_beauty', isRegulated: false, complianceNote: null, defaultHsnSac: '999722', defaultGstRatePercent: 18 },
  { id: 'cat_35_hairstylist', name: 'Hairstylist', slug: 'hairstylist', parentId: 'cat_parent_beauty', isRegulated: false, complianceNote: null, defaultHsnSac: '999721', defaultGstRatePercent: 18 },
  { id: 'cat_36_mehndi_artist', name: 'Mehndi Artist', slug: 'mehndi-artist', parentId: 'cat_parent_beauty', isRegulated: false, complianceNote: 'Natural PPD-free henna compliance recommended.', defaultHsnSac: '999722', defaultGstRatePercent: 18 },
  { id: 'cat_37_nail_artist', name: 'Nail Artist', slug: 'nail-artist', parentId: 'cat_parent_beauty', isRegulated: false, complianceNote: null, defaultHsnSac: '999722', defaultGstRatePercent: 18 },
  { id: 'cat_38_grooming_stylist', name: 'Grooming Stylist', slug: 'grooming-stylist', parentId: 'cat_parent_beauty', isRegulated: false, complianceNote: null, defaultHsnSac: '999722', defaultGstRatePercent: 18 },

  // 39-46: Infrastructure
  { id: 'cat_39_lighting_vendor', name: 'Lighting Vendor', slug: 'lighting-vendor', parentId: 'cat_parent_infrastructure', isRegulated: false, complianceNote: null, defaultHsnSac: '997319', defaultGstRatePercent: 18 },
  { id: 'cat_40_led_wall_rental', name: 'LED Wall Rental', slug: 'led-wall-rental', parentId: 'cat_parent_infrastructure', isRegulated: false, complianceNote: null, defaultHsnSac: '997319', defaultGstRatePercent: 18 },
  { id: 'cat_41_generator_rental', name: 'Generator Rental', slug: 'generator-rental', parentId: 'cat_parent_infrastructure', isRegulated: true, complianceNote: 'Requires CPCB silent DG-set acoustic enclosure and grounded earthing.', defaultHsnSac: '997319', defaultGstRatePercent: 18 },
  { id: 'cat_42_tent_provider', name: 'Tent Provider', slug: 'tent-provider', parentId: 'cat_parent_infrastructure', isRegulated: true, complianceNote: 'Requires fire extinguishers on site and unobstructed emergency exits.', defaultHsnSac: '997319', defaultGstRatePercent: 18 },
  { id: 'cat_43_stage_fabrication', name: 'Stage Fabrication', slug: 'stage-fabrication', parentId: 'cat_parent_infrastructure', isRegulated: true, complianceNote: 'Requires certified truss/stage load safety inspection.', defaultHsnSac: '998596', defaultGstRatePercent: 18 },
  { id: 'cat_44_sound_and_light_production', name: 'Sound and Light Production', slug: 'sound-and-light-production', parentId: 'cat_parent_infrastructure', isRegulated: false, complianceNote: null, defaultHsnSac: '998596', defaultGstRatePercent: 18 },
  { id: 'cat_45_cooling_fan_rental', name: 'Cooling/Fan Rental', slug: 'cooling-fan-rental', parentId: 'cat_parent_infrastructure', isRegulated: false, complianceNote: null, defaultHsnSac: '997319', defaultGstRatePercent: 18 },
  { id: 'cat_46_portable_restroom_rental', name: 'Portable Restroom Rental', slug: 'portable-restroom-rental', parentId: 'cat_parent_infrastructure', isRegulated: true, complianceNote: 'Requires authorized municipal sewage disposal compliance.', defaultHsnSac: '999412', defaultGstRatePercent: 18 },

  // 47-52: Transport and logistics
  { id: 'cat_47_wedding_car_rental', name: 'Wedding Car Rental', slug: 'wedding-car-rental', parentId: 'cat_parent_transport', isRegulated: true, complianceNote: 'Requires commercial registration plate, valid insurance, and licensed chauffeur.', defaultHsnSac: '996601', defaultGstRatePercent: 5 },
  { id: 'cat_48_luxury_car_rental', name: 'Luxury Car Rental', slug: 'luxury-car-rental', parentId: 'cat_parent_transport', isRegulated: true, complianceNote: 'Requires commercial registration plate, valid insurance, and licensed chauffeur.', defaultHsnSac: '996601', defaultGstRatePercent: 5 },
  { id: 'cat_49_guest_bus', name: 'Guest Bus', slug: 'guest-bus', parentId: 'cat_parent_transport', isRegulated: true, complianceNote: 'Requires passenger contract carriage permit and vehicle fitness certificate.', defaultHsnSac: '996601', defaultGstRatePercent: 5 },
  { id: 'cat_50_tempo_traveller', name: 'Tempo Traveller', slug: 'tempo-traveller', parentId: 'cat_parent_transport', isRegulated: true, complianceNote: 'Requires passenger contract carriage permit and vehicle fitness certificate.', defaultHsnSac: '996601', defaultGstRatePercent: 5 },
  { id: 'cat_51_goods_transport', name: 'Goods Transport', slug: 'goods-transport', parentId: 'cat_parent_transport', isRegulated: true, complianceNote: 'Requires commercial goods carriage permit and e-way bill where applicable.', defaultHsnSac: '996511', defaultGstRatePercent: 5 },
  { id: 'cat_52_valet_parking', name: 'Valet Parking', slug: 'valet-parking', parentId: 'cat_parent_transport', isRegulated: true, complianceNote: 'All valet drivers must hold valid Indian LMV driving licenses.', defaultHsnSac: '996743', defaultGstRatePercent: 18 },

  // 53-60: Planning and special services
  { id: 'cat_53_wedding_planner', name: 'Wedding Planner', slug: 'wedding-planner', parentId: 'cat_parent_planning', isRegulated: false, complianceNote: null, defaultHsnSac: '998596', defaultGstRatePercent: 18 },
  { id: 'cat_54_event_coordinator', name: 'Event Coordinator', slug: 'event-coordinator', parentId: 'cat_parent_planning', isRegulated: false, complianceNote: null, defaultHsnSac: '998596', defaultGstRatePercent: 18 },
  { id: 'cat_55_invitation_designer_printer', name: 'Invitation Designer/Printer', slug: 'invitation-designer-printer', parentId: 'cat_parent_planning', isRegulated: false, complianceNote: null, defaultHsnSac: '998912', defaultGstRatePercent: 18 },
  { id: 'cat_56_return_gift_vendor', name: 'Return-Gift Vendor', slug: 'return-gift-vendor', parentId: 'cat_parent_planning', isRegulated: false, complianceNote: null, defaultHsnSac: '996211', defaultGstRatePercent: 18 },
  { id: 'cat_57_priest_ceremonial_services', name: 'Priest/Ceremonial Services', slug: 'priest-ceremonial-services', parentId: 'cat_parent_planning', isRegulated: false, complianceNote: null, defaultHsnSac: '999591', defaultGstRatePercent: 0 },
  { id: 'cat_58_security_staff', name: 'Security Staff', slug: 'security-staff', parentId: 'cat_parent_planning', isRegulated: true, complianceNote: 'Requires PSARA (Private Security Agencies Regulation Act) license; unarmed event security only.', defaultHsnSac: '998525', defaultGstRatePercent: 18 },
  { id: 'cat_59_cleaning_crew', name: 'Cleaning Crew', slug: 'cleaning-crew', parentId: 'cat_parent_planning', isRegulated: false, complianceNote: null, defaultHsnSac: '998533', defaultGstRatePercent: 18 },
  { id: 'cat_60_fireworks_special_effects', name: 'Fireworks/Special Effects', slug: 'fireworks-special-effects', parentId: 'cat_parent_planning', isRegulated: true, complianceNote: 'Requires PESO explosives license, local Fire Brigade NOC, and cold-pyro only for indoor venues.', defaultHsnSac: '999614', defaultGstRatePercent: 18 },
];

const ALL_CATEGORIES = [...PARENT_CATEGORIES, ...SERVICE_CATEGORIES];

function findCategoryByIdOrSlug(identifier) {
  if (!identifier) return null;
  const norm = String(identifier).trim().toLowerCase();
  return (
    ALL_CATEGORIES.find(
      (c) =>
        c.id.toLowerCase() === norm ||
        c.slug.toLowerCase() === norm ||
        c.name.toLowerCase() === norm
    ) || null
  );
}

module.exports = {
  PARENT_CATEGORIES,
  SERVICE_CATEGORIES,
  ALL_CATEGORIES,
  findCategoryByIdOrSlug,
};
