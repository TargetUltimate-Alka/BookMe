require('dotenv').config();
const db = require('../shared/db');
const inMemoryStore = require('../shared/inMemoryStore');
const { SERVICE_CATEGORIES } = require('../shared/constants/categoriesData');

const INDIAN_CITIES = [
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  { city: 'Delhi', state: 'Delhi NCR', lat: 28.6139, lng: 77.209 },
  { city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
  { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { city: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  { city: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812 },
  { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { city: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125 },
  { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { city: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { city: 'Chandigarh', state: 'Punjab/Haryana', lat: 30.7333, lng: 76.7794 },
  { city: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 },
  { city: 'Goa', state: 'Goa', lat: 15.2993, lng: 74.124 },
];

const DEMO_PREFIXES = [
  'Shubh', 'Royal', 'Utsav', 'Anand', 'Sangam', 'Nakshatra', 'Vivaah', 'Mangalam',
  'Surya', 'Chandra', 'Peacock', 'Lotus', 'Marigold', 'Zari', 'Mehfil', 'Aarambh',
  'Swastik', 'Darbar', 'Kalyani', 'Navrang', 'Saptapadi', 'Shagun', 'Aashirwad', 'Raga',
];

const DEMO_SUFFIXES = [
  'Events & Co.', 'Creations', 'Studios', 'Hospitality', 'Productions',
  'Collective', 'Artisans', 'Enterprises', 'Specialists', 'Ensemble',
];

function parseCliArgs() {
  const args = process.argv.slice(2);
  let count = 500;
  let batchSize = 5000;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--count=')) {
      count = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--count' || arg === '-c') {
      count = parseInt(args[++i], 10);
    } else if (arg.startsWith('--batch=')) {
      batchSize = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--batch' || arg === '-b') {
      batchSize = parseInt(args[++i], 10);
    }
  }

  return {
    count: isNaN(count) || count < 1 ? 500 : count,
    batchSize: isNaN(batchSize) || batchSize < 100 ? 5000 : batchSize,
  };
}

async function generateDemoData(options = {}) {
  const targetCount = options.count !== undefined ? Number(options.count) : 500;
  const batchSize = Math.min(options.batchSize !== undefined ? Number(options.batchSize) : 5000, targetCount);

  console.log(
    `Starting idempotent BookMe demo data generation (${targetCount.toLocaleString()} fictional vendors, batches of ${batchSize.toLocaleString()})...`
  );

  const padLength = targetCount > 9999 ? 6 : 4;
  const formatId = (prefix, n) => `${prefix}_demo_${String(n).padStart(padLength, '0')}`;

  // Existing ID lookups for O(1) idempotency checks
  const existingVendorIds = new Set(inMemoryStore.vendors.map((v) => v.id));
  const existingServiceIds = new Set(inMemoryStore.services.map((s) => s.id));
  const existingPackageIds = new Set(inMemoryStore.packages.map((p) => p.id));

  let totalAddedVendors = 0;
  let totalAddedServices = 0;
  let totalAddedPackages = 0;
  let pgSeeded = false;

  try {
    await db.query('SELECT 1');
  } catch (err) {
    // in-memory fallback
  }

  if (db.isPgActive()) {
    for (const cat of SERVICE_CATEGORIES) {
      await db.query(
        `INSERT INTO categories (id, name, slug, parent_id, is_regulated, compliance_note, default_hsn_sac, default_gst_rate_percent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           parent_id = EXCLUDED.parent_id`,
        [
          cat.id,
          cat.name,
          cat.slug,
          cat.parentId || null,
          cat.isRegulated || false,
          cat.complianceNote || null,
          cat.defaultHsnSac || '998596',
          cat.defaultGstRatePercent || 18.0,
        ]
      );
    }
  }

  const totalBatches = Math.ceil(targetCount / batchSize);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const startIdx = batchIdx * batchSize + 1;
    const endIdx = Math.min((batchIdx + 1) * batchSize, targetCount);

    const batchVendors = [];
    const batchServices = [];
    const batchPackages = [];

    for (let i = startIdx; i <= endIdx; i++) {
      const cat = SERVICE_CATEGORIES[(i - 1) % SERVICE_CATEGORIES.length];
      const loc = INDIAN_CITIES[(i - 1) % INDIAN_CITIES.length];
      const prefix = DEMO_PREFIXES[(i - 1) % DEMO_PREFIXES.length];
      const suffix = DEMO_SUFFIXES[Math.floor((i - 1) / DEMO_PREFIXES.length) % DEMO_SUFFIXES.length];

      const vendorId = formatId('vnd', i);
      const userId = formatId('usr', i);
      const businessName = `${prefix} ${cat.name} ${suffix} #${i} (Demo)`;
      const baseInr = 15000 + ((i * 1750) % 185000);
      const basePaise = BigInt(baseInr * 100);
      const tier = i % 3 === 0 ? 'Premium' : i % 2 === 0 ? 'Standard' : 'Basic';
      const priceUnit = cat.parentId === 'cat_parent_food' ? 'PER_PLATE' : 'PER_DAY';
      const gstBps = (cat.defaultGstRatePercent || 18) * 100;

      // Slight deterministic lat/lng offset within city
      const latOffset = (((i % 11) - 5) * 0.008);
      const lngOffset = (((i % 13) - 6) * 0.008);

      batchVendors.push({
        id: vendorId,
        user_id: userId,
        business_name: businessName,
        category: cat.name,
        category_id: cat.id,
        description: `[DEMO LISTING — FICTIONAL SAMPLE] ${cat.name} specialist serving ${loc.city}, ${loc.state}. ${cat.complianceNote || 'Standard event terms apply.'}`,
        photo_url: null,
        location: `${loc.city}, ${loc.state}`,
        address: `Demo Sector ${(i % 25) + 1}, ${loc.city}`,
        latitude: Number((loc.lat + latOffset).toFixed(6)),
        longitude: Number((loc.lng + lngOffset).toFixed(6)),
        service_radius_km: 25 + ((i * 5) % 75),
        service_areas: [loc.city],
        verified: false, // Never mark demo vendors as verified KYC businesses
        kyc_status: 'DRAFT',
        is_demo: true,
        rating: null, // No fake verified reviews on demo profiles
        review_count: 0,
        is_featured: false,
        preferred_language: i % 5 === 0 ? 'hi' : i % 7 === 0 ? 'gu' : 'en',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Ensure at least 60 distinct demo services across the 60 categories
      // For large generation, generate service for each vendor
      const shouldGenService = targetCount <= 500 ? i <= 120 : true;
      const svcId = formatId('svc', i);

      if (shouldGenService) {
        const svcInr = priceUnit === 'PER_PLATE' ? 650 + ((i * 50) % 1500) : baseInr;
        batchServices.push({
          id: svcId,
          vendor_id: vendorId,
          category_id: cat.id,
          title: `${cat.name} — ${tier} Service Package (Demo)`,
          description: `[DEMO SERVICE] Fictional ${cat.name} offering in ${loc.city}.`,
          base_price: svcInr,
          base_price_paise: BigInt(svcInr * 100),
          is_active: true,
          created_at: new Date(),
        });
      }

      const pkgId = formatId('pkg', i);
      const pkgPaise = priceUnit === 'PER_PLATE' ? BigInt((650 + ((i * 50) % 1500)) * 100) : basePaise;
      batchPackages.push({
        id: pkgId,
        vendor_id: vendorId,
        category_id: cat.id,
        name: `${cat.name} ${tier} Package`,
        tier,
        description: `[DEMO PACKAGE] Includes standard ${cat.name.toLowerCase()} deliverables for ${loc.city}.`,
        service_ids: shouldGenService ? [svcId] : [],
        price: Number(pkgPaise) / 100,
        base_price_paise: pkgPaise,
        price_unit: priceUnit,
        min_guests: priceUnit === 'PER_PLATE' ? 50 : 1,
        max_guests: priceUnit === 'PER_PLATE' ? 1000 : 500,
        duration_hours: 8,
        overtime_rate_paise: 250000n,
        total_capacity_units: (i % 4) + 1,
        security_deposit_paise: 500000n,
        gst_rate_bps: gstBps,
        hsn_sac_code: cat.defaultHsnSac || '998596',
        tax_inclusive: false,
        inclusions: [`Standard ${cat.name} setup`, 'On-site coordination'],
        exclusions: ['Outstation travel beyond service radius'],
        brand_attributes: { demoSample: true, regulatedService: cat.isRegulated },
        cancellation_policy: 'MODERATE',
        status: 'DRAFT',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Insert into in-memory store
    for (const v of batchVendors) {
      if (!existingVendorIds.has(v.id)) {
        existingVendorIds.add(v.id);
        inMemoryStore.vendors.push(v);
        inMemoryStore.vendorCategories.push({
          vendor_id: v.id,
          category_id: v.category_id,
          is_primary: true,
        });
        totalAddedVendors++;
      }
    }

    for (const s of batchServices) {
      if (!existingServiceIds.has(s.id)) {
        existingServiceIds.add(s.id);
        inMemoryStore.services.push(s);
        totalAddedServices++;
      }
    }

    for (const p of batchPackages) {
      if (!existingPackageIds.has(p.id)) {
        existingPackageIds.add(p.id);
        inMemoryStore.packages.push(p);
        totalAddedPackages++;
      }
    }

    // Insert into PostgreSQL in transaction if active
    if (db.isPgActive()) {
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        for (const v of batchVendors) {
          await client.query(
            `INSERT INTO vendors (
               id, user_id, business_name, category, description, location, address,
               latitude, longitude, service_radius_km, service_areas, verified, kyc_status,
               is_demo, rating, review_count, preferred_language
             )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
             ON CONFLICT (id) DO NOTHING`,
            [
              v.id, v.user_id, v.business_name, v.category, v.description, v.location, v.address,
              v.latitude, v.longitude, v.service_radius_km, Array.isArray(v.service_areas) ? v.service_areas : [],
              v.verified, v.kyc_status, v.is_demo, v.rating, v.review_count, v.preferred_language,
            ]
          );

          await client.query(
            `INSERT INTO vendor_categories (vendor_id, category_id, is_primary)
             VALUES ($1, $2, TRUE)
             ON CONFLICT (vendor_id, category_id) DO NOTHING`,
            [v.id, v.category_id]
          );
        }

        for (const s of batchServices) {
          await client.query(
            `INSERT INTO services (id, vendor_id, category_id, title, description, base_price, base_price_paise, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (id) DO NOTHING`,
            [s.id, s.vendor_id, s.category_id, s.title, s.description, s.base_price, s.base_price_paise.toString(), s.is_active]
          );
        }

        for (const p of batchPackages) {
          await client.query(
            `INSERT INTO packages (
               id, vendor_id, category_id, name, tier, description, service_ids, price,
               base_price_paise, price_unit, min_guests, max_guests, duration_hours,
               overtime_rate_paise, total_capacity_units, security_deposit_paise,
               gst_rate_bps, hsn_sac_code, tax_inclusive, inclusions, exclusions,
               brand_attributes, cancellation_policy, status
             )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
             ON CONFLICT (id) DO NOTHING`,
            [
              p.id, p.vendor_id, p.category_id, p.name, p.tier, p.description,
              Array.isArray(p.service_ids) ? p.service_ids : [], p.price, p.base_price_paise.toString(),
              p.price_unit, p.min_guests, p.max_guests, p.duration_hours,
              p.overtime_rate_paise.toString(), p.total_capacity_units,
              p.security_deposit_paise.toString(), p.gst_rate_bps, p.hsn_sac_code,
              p.tax_inclusive, JSON.stringify(p.inclusions), JSON.stringify(p.exclusions),
              JSON.stringify(p.brand_attributes), p.cancellation_policy, p.status,
            ]
          );
        }

        await client.query('COMMIT');
        pgSeeded = true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error seeding demo batch ${batchIdx + 1} into PostgreSQL:`, error.message);
        throw error;
      } finally {
        client.release();
      }
    }

    if (totalBatches > 1) {
      console.log(
        `Batch ${batchIdx + 1}/${totalBatches} completed (${endIdx.toLocaleString()}/${targetCount.toLocaleString()} records).`
      );
    }
  }

  const totalDemoVendors = inMemoryStore.vendors.filter((v) => v.is_demo === true).length;
  const totalDemoServices = inMemoryStore.services.filter((s) => String(s.id).startsWith('svc_demo_')).length;

  console.log(
    `Demo data generation complete: ${totalDemoVendors} demo vendors (${totalAddedVendors} newly added), ${totalDemoServices} demo services (${totalAddedServices} newly added), ${totalAddedPackages} demo packages added. PostgreSQL seeded: ${pgSeeded}.`
  );

  return {
    totalDemoVendors,
    totalDemoServices,
    addedVendorsMem: totalAddedVendors,
    addedServicesMem: totalAddedServices,
    addedPackagesMem: totalAddedPackages,
    pgSeeded,
  };
}

if (require.main === module) {
  const cliArgs = parseCliArgs();
  generateDemoData(cliArgs)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { generateDemoData };
