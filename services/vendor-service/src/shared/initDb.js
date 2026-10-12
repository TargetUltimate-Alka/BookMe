const db = require('./db');

const createTablesQuery = `
  CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    business_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    is_demo BOOLEAN DEFAULT FALSE,
    rating NUMERIC(3, 2) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(50) PRIMARY KEY,
    vendor_id VARCHAR(50) REFERENCES vendors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS packages (
    id VARCHAR(50) PRIMARY KEY,
    vendor_id VARCHAR(50) REFERENCES vendors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    service_ids VARCHAR(50)[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS availability (
    id VARCHAR(50) PRIMARY KEY,
    vendor_id VARCHAR(50) REFERENCES vendors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'BLOCKED',
    reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_vendor_date UNIQUE (vendor_id, date)
  );

  -- Seed Default Verified Vendors (Idempotent)
  INSERT INTO vendors (id, user_id, business_name, category, description, location, verified, is_demo, rating)
  VALUES 
    ('vnd_sunset_caterers', 'usr_sunset_01', 'Sunset Royal Caterers & Event Crafters', 'catering', 'Specialized in royal destination wedding buffets, multi-cuisine live counters, and artisanal mocktail lounges.', 'SG Highway, Ahmedabad, India', TRUE, FALSE, 4.96),
    ('vnd_dream_clicks', 'usr_dream_02', 'Dream Clicks Cinematic Studio', 'photography', 'Award-winning candid wedding storytellers, cinematic 4K highlight reels, drone aerial shoots.', 'Vastrapur, Ahmedabad, India', TRUE, FALSE, 4.90),
    ('vnd_aura_decors', 'usr_aura_03', 'Aura Luxury Stage & Floral Decors', 'decoration', 'Grand entrance floral arches, dynamic LED tunnel stages, and royal wedding mandap setups.', 'Bodakdev, Ahmedabad, India', TRUE, FALSE, 4.85),
    ('vnd_electra_dj', 'usr_electra_04', 'Electra DJ & Sound Innovations', 'dj', 'High-energy club DJ setups, celebrity sangeet nights, JBL line array sound & intelligent CO2 fog jets.', 'Prahlad Nagar, Ahmedabad, India', TRUE, FALSE, 4.95)
  ON CONFLICT (id) DO NOTHING;

  -- Seed Services
  INSERT INTO services (id, vendor_id, title, description, base_price)
  VALUES
    ('svc_royal_buffet', 'vnd_sunset_caterers', 'Signature Royal Wedding Multi-Cuisine Feast', '4 Starters, 6 Main Course, Dal Makhani, Paneer Tikka Masala, Dum Biryani & 3 Desserts', 45000),
    ('svc_live_chaat', 'vnd_sunset_caterers', 'Live Delhi Chaat & Street Food Counter', 'Pani Puri, Dahi Bhalla, Sev Puri & Aloo Tikki with 2 Dedicated Chefs', 15000),
    ('svc_candid_photo', 'vnd_dream_clicks', 'Full Day Candid Wedding Shoot & 4K Cinema', '2 Photographers + 1 Cinematographer + Drone Aerial Coverage', 55000)
  ON CONFLICT (id) DO NOTHING;

  -- Seed Packages
  INSERT INTO packages (id, vendor_id, name, price, service_ids)
  VALUES
    ('pkg_royal_buffet', 'vnd_sunset_caterers', 'Signature 5-Course Royal Wedding Buffet', 45000, ARRAY['svc_royal_buffet']),
    ('pkg_platinum_photo', 'vnd_dream_clicks', 'Platinum Wedding Cinema & Drone Package', 95000, ARRAY['svc_candid_photo'])
  ON CONFLICT (id) DO NOTHING;

  -- Seed Availability
  INSERT INTO availability (id, vendor_id, date, status, reason)
  VALUES
    ('blk_dec_05', 'vnd_sunset_caterers', '2026-12-05', 'BLOCKED', '💍 Booked for Grand Destination Wedding')
  ON CONFLICT (vendor_id, date) DO NOTHING;
`;

async function initDb() {
  try {
    console.log('Initializing database schema...');
    await db.query(createTablesQuery);
    console.log('Database schema and seed verified successfully.');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}

module.exports = initDb;
