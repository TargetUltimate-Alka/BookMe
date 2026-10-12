const { faker } = require('@faker-js/faker');
const db = require('../shared/db');

async function generateDemoData() {
  console.log('Starting demo data generation...');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Generate 500 Vendors
    for (let i = 0; i < 500; i++) {
        const vendor = {
            id: `vnd_demo_${faker.string.uuid()}`,
            user_id: `usr_demo_${faker.string.uuid()}`,
            business_name: faker.company.name(),
            category: faker.helpers.arrayElement(['catering', 'photography', 'decoration', 'dj', 'venue']),
            description: faker.lorem.sentence(),
            location: faker.location.city(),
            verified: false,
            is_demo: true,
            rating: faker.number.float({ min: 3, max: 5, precision: 0.1 })
        };
        await client.query(
            `INSERT INTO vendors (id, user_id, business_name, category, description, location, verified, is_demo, rating)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO NOTHING`,
             [vendor.id, vendor.user_id, vendor.business_name, vendor.category, vendor.description, vendor.location, vendor.verified, vendor.is_demo, vendor.rating]
        );
    }
    console.log('Generated 500 demo vendors.');

    // 2. Generate 60+ Services
    const serviceTitles = [
        'Signature Catering', 'Street Food', 'Candid Photoshoot', 'Cinematic Film',
        'Traditional Decor', 'Stage Setup', 'DJ Performance', 'Live Band', 'Floral Decor', 'Venue Rental'
    ];
    
    // Fetch all demo vendors to associate services
    const { rows: demoVendors } = await client.query("SELECT id FROM vendors WHERE is_demo = TRUE");
    
    for (let i = 0; i < 60; i++) {
        const vendor = faker.helpers.arrayElement(demoVendors);
        const service = {
            id: `svc_demo_${faker.string.uuid()}`,
            vendor_id: vendor.id,
            title: faker.helpers.arrayElement(serviceTitles) + ' - ' + faker.word.adjective(),
            description: faker.lorem.paragraph(),
            base_price: faker.number.int({ min: 5000, max: 100000 })
        };
        await client.query(
            `INSERT INTO services (id, vendor_id, title, description, base_price)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
             [service.id, service.vendor_id, service.title, service.description, service.base_price]
        );
    }
    console.log('Generated 60 demo services.');

    await client.query('COMMIT');
    console.log('Demo data generation completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating demo data:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

generateDemoData();
