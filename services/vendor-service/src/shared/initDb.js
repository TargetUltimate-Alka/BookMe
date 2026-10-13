const fs = require('fs');
const path = require('path');
const db = require('./db');
const { ALL_CATEGORIES } = require('./constants/categoriesData');
const { DEFAULT_CONFIGS } = require('./constants/defaultConfigs');

async function initDb() {
  try {
    console.log('[vendor-service] Initializing database schema & migrations...');

    // Probe connection with a lightweight query first
    await db.query('SELECT 1;');

    if (db.isPgActive()) {
      const migrationPath = path.resolve(
        __dirname,
        '../../migrations/001_vendor_module_srs.up.sql'
      );
      if (fs.existsSync(migrationPath)) {
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        await db.query(migrationSql);
      }

      // Seed 68 Categories (8 Parent + 60 Child Service Types) idempotently
      for (const cat of ALL_CATEGORIES) {
        await db.query(
          `INSERT INTO categories (id, name, slug, parent_id, is_regulated, compliance_note, default_hsn_sac, default_gst_rate_percent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             slug = EXCLUDED.slug,
             parent_id = EXCLUDED.parent_id,
             is_regulated = EXCLUDED.is_regulated,
             compliance_note = EXCLUDED.compliance_note,
             default_hsn_sac = EXCLUDED.default_hsn_sac,
             default_gst_rate_percent = EXCLUDED.default_gst_rate_percent;`,
          [
            cat.id,
            cat.name,
            cat.slug,
            cat.parentId,
            Boolean(cat.isRegulated),
            cat.complianceNote,
            cat.defaultHsnSac || '998596',
            cat.defaultGstRatePercent ?? 18,
          ]
        );
      }

      // Seed SRS §2.3 CONFIG defaults idempotently
      for (const cfg of DEFAULT_CONFIGS) {
        await db.query(
          `INSERT INTO configs (key, value, description, updated_by)
           VALUES ($1, $2, $3, 'system')
           ON CONFLICT (key) DO NOTHING;`,
          [cfg.key, String(cfg.value), cfg.description]
        );
      }

      // Seed Default Verified Vendors idempotently
      await db.query(`
        INSERT INTO vendors (
          id, user_id, business_name, category, description, location, city, state,
          latitude, longitude, service_radius_km, verified, is_demo, kyc_status,
          digilocker_verified, pan_verified, bank_verified, agreement_version,
          agreement_signed_at, rating, total_reviews, wallet_balance_paise
        )
        VALUES
          ('vnd_sunset_caterers', 'usr_sunset_01', 'Sunset Royal Caterers & Event Crafters', 'catering', 'Specialized in royal destination wedding buffets, multi-cuisine live counters, and artisanal mocktail lounges.', 'SG Highway, Ahmedabad, India', 'Ahmedabad', 'Gujarat', 23.033863, 72.507423, 50, TRUE, FALSE, 'APPROVED', TRUE, TRUE, TRUE, '1.0.0', CURRENT_TIMESTAMP, 4.96, 42, 150000),
          ('vnd_dream_clicks', 'usr_dream_02', 'Dream Clicks Cinematic Studio', 'photography', 'Award-winning candid wedding storytellers, cinematic 4K highlight reels, drone aerial shoots.', 'Vastrapur, Ahmedabad, India', 'Ahmedabad', 'Gujarat', 23.035001, 72.529324, 100, TRUE, FALSE, 'APPROVED', TRUE, TRUE, TRUE, '1.0.0', CURRENT_TIMESTAMP, 4.90, 38, 120000),
          ('vnd_aura_decors', 'usr_aura_03', 'Aura Luxury Stage & Floral Decors', 'decoration', 'Grand entrance floral arches, dynamic LED tunnel stages, and royal wedding mandap setups.', 'Bodakdev, Ahmedabad, India', 'Ahmedabad', 'Gujarat', 23.040212, 72.511891, 60, TRUE, FALSE, 'APPROVED', TRUE, TRUE, TRUE, '1.0.0', CURRENT_TIMESTAMP, 4.85, 29, 110000),
          ('vnd_electra_dj', 'usr_electra_04', 'Electra DJ & Sound Innovations', 'dj', 'High-energy club DJ setups, celebrity sangeet nights, JBL line array sound & intelligent CO2 fog jets.', 'Prahlad Nagar, Ahmedabad, India', 'Ahmedabad', 'Gujarat', 23.012034, 72.510754, 80, TRUE, FALSE, 'APPROVED', TRUE, TRUE, TRUE, '1.0.0', CURRENT_TIMESTAMP, 4.95, 54, 180000)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO services (id, vendor_id, title, description, base_price, base_price_paise, category_id)
        VALUES
          ('svc_royal_buffet', 'vnd_sunset_caterers', 'Signature Royal Wedding Multi-Cuisine Feast', '4 Starters, 6 Main Course, Dal Makhani, Paneer Tikka Masala, Dum Biryani & 3 Desserts', 45000, 4500000, 'cat_09_caterer'),
          ('svc_live_chaat', 'vnd_sunset_caterers', 'Live Delhi Chaat & Street Food Counter', 'Pani Puri, Dahi Bhalla, Sev Puri & Aloo Tikki with 2 Dedicated Chefs', 15000, 1500000, 'cat_12_live_food_counter'),
          ('svc_candid_photo', 'vnd_dream_clicks', 'Full Day Candid Wedding Shoot & 4K Cinema', '2 Photographers + 1 Cinematographer + Drone Aerial Coverage', 55000, 5500000, 'cat_02_candid_photographer')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO packages (id, vendor_id, category_id, name, tier, price, base_price_paise, pricing_unit, service_ids, inclusions, status, gst_rate_percent, hsn_sac_code, compliance_acknowledged)
        VALUES
          ('pkg_royal_buffet', 'vnd_sunset_caterers', 'cat_09_caterer', 'Signature 5-Course Royal Wedding Buffet', 'Premium', 45000, 4500000, 'per_day', ARRAY['svc_royal_buffet'], '["4 Welcome Drinks","4 Starters","6 Main Courses","3 Live Counters"]'::jsonb, 'PUBLISHED', 5.00, '996331', TRUE),
          ('pkg_platinum_photo', 'vnd_dream_clicks', 'cat_01_wedding_photographer', 'Platinum Wedding Cinema & Drone Package', 'Premium', 95000, 9500000, 'per_day', ARRAY['svc_candid_photo'], '["2 Candid Photographers","2 Cinematographers","1 Drone Pilot"]'::jsonb, 'PUBLISHED', 18.00, '998386', TRUE)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO availability (id, vendor_id, date, status, reason)
        VALUES
          ('blk_dec_05', 'vnd_sunset_caterers', '2026-12-05', 'BLOCKED', '💍 Booked for Grand Destination Wedding')
        ON CONFLICT (vendor_id, date) DO NOTHING;
      `);

      console.log('[vendor-service] PostgreSQL schema and SRS seeds verified.');
    } else {
      console.log(
        '[vendor-service] In-memory store initialized with 60 SRS service categories, CONFIG table, and seed vendors.'
      );
    }
  } catch (error) {
    console.error('[vendor-service] Failed to initialize database schema:', error);
    throw error;
  }
}

module.exports = initDb;
