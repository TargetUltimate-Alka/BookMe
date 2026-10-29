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
    slug: 'music',
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

const CATEGORY_ALIASES = {
  // Music & DJ
  'dj': ['cat_25_dj', 'cat_parent_music'],
  'dj & music': ['cat_25_dj', 'cat_parent_music'],
  'music': ['cat_parent_music', 'cat_25_dj'],
  'music and entertainment': ['cat_parent_music'],
  'live band': ['cat_26_live_band', 'cat_parent_music'],
  'singer': ['cat_27_singer', 'cat_parent_music'],
  'dhol': ['cat_29_dhol_group', 'cat_parent_music'],
  'dhol group': ['cat_29_dhol_group', 'cat_parent_music'],
  'sound system': ['cat_32_sound_system_rental', 'cat_parent_music'],

  // Food & Catering
  'catering': ['cat_parent_food', 'cat_09_caterer'],
  'caterer': ['cat_09_caterer', 'cat_parent_food'],
  'catering & cooks': ['cat_parent_food', 'cat_09_caterer'],
  'food': ['cat_parent_food', 'cat_09_caterer'],
  'food and hospitality': ['cat_parent_food'],
  'veg caterer': ['cat_10_vegetarian_caterer', 'cat_parent_food'],
  'vegetarian caterer': ['cat_10_vegetarian_caterer', 'cat_parent_food'],
  'non veg caterer': ['cat_11_non_vegetarian_caterer', 'cat_parent_food'],
  'chaat': ['cat_12_live_food_counter', 'cat_parent_food'],
  'live chaat': ['cat_12_live_food_counter', 'cat_parent_food'],
  'live food counter': ['cat_12_live_food_counter', 'cat_parent_food'],
  'sweets': ['cat_13_sweets_and_desserts', 'cat_parent_food'],
  'desserts': ['cat_13_sweets_and_desserts', 'cat_parent_food'],
  'cake': ['cat_14_wedding_cake_maker', 'cat_parent_food'],
  'wedding cake': ['cat_14_wedding_cake_maker', 'cat_parent_food'],
  'mocktails': ['cat_15_beverage_service', 'cat_parent_food'],
  'beverage': ['cat_15_beverage_service', 'cat_parent_food'],

  // Photography & Media
  'photography': ['cat_parent_photography', 'cat_01_wedding_photographer'],
  'photography & videography': ['cat_parent_photography', 'cat_01_wedding_photographer'],
  'photographer': ['cat_01_wedding_photographer', 'cat_parent_photography'],
  'wedding photographer': ['cat_01_wedding_photographer', 'cat_parent_photography'],
  'candid photography': ['cat_02_candid_photographer', 'cat_parent_photography'],
  'candid photographer': ['cat_02_candid_photographer', 'cat_parent_photography'],
  'pre wedding': ['cat_03_pre_wedding_photographer', 'cat_parent_photography'],
  'videographer': ['cat_04_videographer', 'cat_parent_photography'],
  'cinematography': ['cat_05_cinematic_filmmaker', 'cat_parent_photography'],
  'drone': ['cat_06_drone_videography', 'cat_parent_photography'],
  'drone videography': ['cat_06_drone_videography', 'cat_parent_photography'],
  'photo booth': ['cat_07_photo_booth', 'cat_parent_photography'],

  // Decoration
  'decoration': ['cat_parent_decoration', 'cat_17_wedding_decorator'],
  'decor': ['cat_parent_decoration', 'cat_17_wedding_decorator'],
  'decoration & balloons': ['cat_parent_decoration', 'cat_17_wedding_decorator'],
  'decoration and setup': ['cat_parent_decoration'],
  'wedding decorator': ['cat_17_wedding_decorator', 'cat_parent_decoration'],
  'mandap': ['cat_18_mandap_decorator', 'cat_parent_decoration'],
  'mandap decorator': ['cat_18_mandap_decorator', 'cat_parent_decoration'],
  'stage': ['cat_19_stage_decorator', 'cat_parent_decoration'],
  'stage decorator': ['cat_19_stage_decorator', 'cat_parent_decoration'],
  'balloons': ['cat_20_balloon_decorator', 'cat_parent_decoration'],
  'balloon decorator': ['cat_20_balloon_decorator', 'cat_parent_decoration'],
  'floral': ['cat_21_floral_decorator', 'cat_parent_decoration'],
  'flowers': ['cat_21_floral_decorator', 'cat_parent_decoration'],

  // Beauty & Styling
  'beauty': ['cat_parent_beauty', 'cat_33_bridal_makeup_artist'],
  'beauty and styling': ['cat_parent_beauty'],
  'makeup': ['cat_33_bridal_makeup_artist', 'cat_parent_beauty'],
  'makeup & beauty': ['cat_parent_beauty', 'cat_33_bridal_makeup_artist'],
  'bridal makeup': ['cat_33_bridal_makeup_artist', 'cat_parent_beauty'],
  'bridal makeup artist': ['cat_33_bridal_makeup_artist', 'cat_parent_beauty'],
  'party makeup': ['cat_34_party_makeup_artist', 'cat_parent_beauty'],
  'hairstylist': ['cat_35_hairstylist', 'cat_parent_beauty'],
  'hair': ['cat_35_hairstylist', 'cat_parent_beauty'],
  'mehndi': ['cat_36_mehndi_artist', 'cat_parent_beauty'],
  'mehndi artist': ['cat_36_mehndi_artist', 'cat_parent_beauty'],
  'mehndi artists': ['cat_36_mehndi_artist', 'cat_parent_beauty'],
  'mehendi': ['cat_36_mehndi_artist', 'cat_parent_beauty'],
  'henna': ['cat_36_mehndi_artist', 'cat_parent_beauty'],

  // Infrastructure & Tents & Lighting
  'infrastructure': ['cat_parent_infrastructure', 'cat_42_tent_provider'],
  'lighting': ['cat_39_lighting_vendor', 'cat_parent_infrastructure'],
  'lighting & effects': ['cat_39_lighting_vendor', 'cat_parent_infrastructure'],
  'lights': ['cat_39_lighting_vendor', 'cat_parent_infrastructure'],
  'led wall': ['cat_40_led_wall_rental', 'cat_parent_infrastructure'],
  'generator': ['cat_41_generator_rental', 'cat_parent_infrastructure'],
  'tent': ['cat_42_tent_provider', 'cat_parent_infrastructure'],
  'tents': ['cat_42_tent_provider', 'cat_parent_infrastructure'],
  'tent provider': ['cat_42_tent_provider', 'cat_parent_infrastructure'],
  'tents & event setup': ['cat_parent_infrastructure', 'cat_42_tent_provider'],
  'sound and light': ['cat_44_sound_and_light_production', 'cat_parent_infrastructure'],

  // Transport
  'transport': ['cat_parent_transport', 'cat_47_wedding_car_rental'],
  'transportation': ['cat_parent_transport', 'cat_47_wedding_car_rental'],
  'transport and logistics': ['cat_parent_transport'],
  'transportation & luxury cars': ['cat_parent_transport', 'cat_48_luxury_car_rental'],
  'wedding cars': ['cat_47_wedding_car_rental', 'cat_parent_transport'],
  'wedding car': ['cat_47_wedding_car_rental', 'cat_parent_transport'],
  'luxury cars': ['cat_48_luxury_car_rental', 'cat_parent_transport'],
  'vintage cars': ['cat_47_wedding_car_rental', 'cat_parent_transport'],
  'bus': ['cat_49_guest_bus', 'cat_parent_transport'],
  'guest bus': ['cat_49_guest_bus', 'cat_parent_transport'],
  'tempo traveller': ['cat_50_tempo_traveller', 'cat_parent_transport'],
  'valet': ['cat_52_valet_parking', 'cat_parent_transport'],

  // Planning & Special Services
  'planning': ['cat_parent_planning', 'cat_53_wedding_planner'],
  'planning and special services': ['cat_parent_planning'],
  'wedding planner': ['cat_53_wedding_planner', 'cat_parent_planning'],
  'planner': ['cat_53_wedding_planner', 'cat_parent_planning'],
  'event coordinator': ['cat_54_event_coordinator', 'cat_parent_planning'],
  'invitations': ['cat_55_invitation_designer_printer', 'cat_parent_planning'],
  'priest': ['cat_57_priest_ceremonial_services', 'cat_parent_planning'],
  'pandit': ['cat_57_priest_ceremonial_services', 'cat_parent_planning'],
  'security': ['cat_58_security_staff', 'cat_parent_planning'],
  'fireworks': ['cat_60_fireworks_special_effects', 'cat_parent_planning'],
  'pyro': ['cat_60_fireworks_special_effects', 'cat_parent_planning'],

  // Choreography, Emcee & Entertainment
  'choreography': ['cat_26_live_band', 'cat_54_event_coordinator', 'cat_parent_music'],
  'choreography & emcee': ['cat_26_live_band', 'cat_54_event_coordinator', 'cat_parent_music'],
  'choreographer': ['cat_26_live_band', 'cat_54_event_coordinator', 'cat_parent_music'],
  'emcee': ['cat_54_event_coordinator', 'cat_parent_music'],
  'anchor': ['cat_54_event_coordinator', 'cat_parent_music'],
  'dance': ['cat_26_live_band', 'cat_parent_music'],
  'sangeet choreographer': ['cat_26_live_band', 'cat_parent_music'],
};

const ALL_CATEGORIES = [...PARENT_CATEGORIES, ...SERVICE_CATEGORIES];

function findCategoryByIdOrSlug(identifier) {
  if (!identifier) return null;
  const norm = String(identifier).trim().toLowerCase();

  // 1. Direct exact match on ID, slug, or name
  const direct = ALL_CATEGORIES.find(
    (c) =>
      c.id.toLowerCase() === norm ||
      c.slug.toLowerCase() === norm ||
      c.name.toLowerCase() === norm
  );
  if (direct) return direct;

  // 2. Check alias map
  if (CATEGORY_ALIASES[norm] && CATEGORY_ALIASES[norm].length > 0) {
    const targetId = CATEGORY_ALIASES[norm][0];
    const aliased = ALL_CATEGORIES.find((c) => c.id === targetId);
    if (aliased) return aliased;
  }

  // 3. Substring match on slug or name
  const partial = ALL_CATEGORIES.find(
    (c) =>
      c.slug.toLowerCase().includes(norm) ||
      norm.includes(c.slug.toLowerCase()) ||
      c.name.toLowerCase().includes(norm) ||
      norm.includes(c.name.toLowerCase())
  );
  if (partial) return partial;

  return null;
}

module.exports = {
  PARENT_CATEGORIES,
  SERVICE_CATEGORIES,
  ALL_CATEGORIES,
  CATEGORY_ALIASES,
  findCategoryByIdOrSlug,
};
