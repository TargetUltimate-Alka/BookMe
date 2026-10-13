const assert = require('assert');
const vendorRepo = require('../src/modules/vendor/repository/vendorRepository');

async function testSearchDiscovery() {
  console.log('Testing Customer Search & Vendor Discovery across SRS categories & cities...');

  // 1. Search "DJ in Ahmedabad"
  const djAhmedabad = await vendorRepo.advancedSearchVendors({
    q: 'DJ in Ahmedabad',
    limit: 20,
  });
  assert.strictEqual(djAhmedabad.items.length > 0, true, 'Search "DJ in Ahmedabad" must return matching vendors');
  const hasAhmedabadDj = djAhmedabad.items.some((v) =>
    (v.businessName.toLowerCase().includes('dj') || v.category.toLowerCase().includes('dj')) &&
    (v.location.toLowerCase().includes('ahmedabad') || (v.serviceAreas || []).some(a => a.toLowerCase().includes('ahmedabad')))
  );
  assert.strictEqual(hasAhmedabadDj, true, 'At least one DJ in Ahmedabad must be found');
  console.log(`✓ "DJ in Ahmedabad" found ${djAhmedabad.items.length} matching vendors`);

  // 2. Search category "Catering & Cooks" or "Catering"
  const catering = await vendorRepo.advancedSearchVendors({
    category: 'Catering & Cooks',
    limit: 20,
  });
  assert.strictEqual(catering.items.length > 0, true, 'Search category "Catering & Cooks" must return vendors');
  console.log(`✓ "Catering & Cooks" found ${catering.items.length} matching vendors`);

  // 3. Search "Chaat" or "Live Chaat"
  const chaat = await vendorRepo.advancedSearchVendors({
    q: 'Chaat',
    limit: 20,
  });
  assert.strictEqual(chaat.items.length > 0, true, 'Search "Chaat" must return vendors');
  console.log(`✓ "Chaat" found ${chaat.items.length} matching vendors`);

  // 4. Search "Bridal Makeup"
  const makeup = await vendorRepo.advancedSearchVendors({
    category: 'Makeup & Beauty',
    limit: 20,
  });
  assert.strictEqual(makeup.items.length > 0, true, 'Search "Makeup & Beauty" must return vendors');
  console.log(`✓ "Makeup & Beauty" found ${makeup.items.length} matching vendors`);

  // 5. Search "Tents & Event Setup"
  const tents = await vendorRepo.advancedSearchVendors({
    category: 'Tents & Event Setup',
    limit: 20,
  });
  assert.strictEqual(tents.items.length > 0, true, 'Search "Tents & Event Setup" must return vendors');
  console.log(`✓ "Tents & Event Setup" found ${tents.items.length} matching vendors`);

  // 6. Search "Mehndi Artists"
  const mehndi = await vendorRepo.advancedSearchVendors({
    category: 'Mehndi Artists',
    limit: 20,
  });
  assert.strictEqual(mehndi.items.length > 0, true, 'Search "Mehndi Artists" must return vendors');
  console.log(`✓ "Mehndi Artists" found ${mehndi.items.length} matching vendors`);

  // 7. Search location "Ahmedabad" without category
  const ahmedabadVendors = await vendorRepo.advancedSearchVendors({
    location: 'Ahmedabad',
    limit: 50,
  });
  assert.strictEqual(ahmedabadVendors.items.length >= 20, true, 'Ahmedabad must have at least 20 verified vendors');
  console.log(`✓ "Ahmedabad" location search found ${ahmedabadVendors.items.length} verified vendors`);

  // 8. Pan-India search (location "all")
  const allIndia = await vendorRepo.advancedSearchVendors({
    location: 'all',
    limit: 100,
  });
  assert.strictEqual(allIndia.items.length >= 60, true, 'Pan-India search should return all 60+ verified base vendors');
  console.log(`✓ Pan-India search returned ${allIndia.items.length} verified vendors`);

  console.log('🎉 ALL SEARCH & DISCOVERY SCENARIOS PASSED 100%!');
}

if (require.main === module) {
  testSearchDiscovery()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { testSearchDiscovery };
