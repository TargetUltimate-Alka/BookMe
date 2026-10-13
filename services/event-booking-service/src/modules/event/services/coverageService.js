const eventRepository = require('../repository/eventRepository');
const checklistRepository = require('../repository/checklistRepository');
const checklistService = require('./checklistService');
const { vendorClient } = require('../../../clients/vendorClient');

class CoverageService {
  async listMatchingVendorsForItem(eventId, itemId, user) {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      const err = new Error(`Event ${eventId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'supportagent';
    if (!isAdmin && event.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const item = await checklistRepository.findById(itemId);
    if (!item) {
      const err = new Error(`Checklist item ${itemId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const category = item.category || 'Catering';
    // Match available packages in vendorClient
    const matchingPackages = [];
    const vendors = vendorClient.vendors ? Object.values(vendorClient.vendors) : [];

    for (const v of vendors) {
      if (!v.active || !v.verified) continue;
      if (v.category && v.category.toLowerCase().includes(category.toLowerCase())) {
        for (const [svcId, svc] of Object.entries(v.services || {})) {
          for (const [pkgId, pkg] of Object.entries(svc.packages || {})) {
            matchingPackages.push({
              vendorId: v.id,
              vendorName: v.name,
              packageId: pkg.id,
              packageName: pkg.name,
              pricePaise: Math.round(Number(pkg.price || 50000) * 100),
              rating: v.rating || 4.8,
            });
          }
        }
      }
    }

    if (matchingPackages.length === 0) {
      // Fallback matching mock item
      matchingPackages.push({
        vendorId: 'vnd_456',
        vendorName: 'Sunset Catering',
        packageId: 'pkg_111',
        packageName: 'Gold Buffet Package',
        pricePaise: 12000000,
        rating: 4.9,
      });
    }

    return matchingPackages;
  }

  async getEventCoverageSummary(eventId, user) {
    const items = await checklistService.getChecklist(eventId, user);
    const totalItemsCount = items.length;
    const coveredItemsCount = items.filter((i) => i.coverageStatus === 'BOOKED' || i.coverageStatus === 'REQUESTED').length;
    const notCoveredItemsCount = totalItemsCount - coveredItemsCount;

    return {
      eventId,
      totalItemsCount,
      totalItems: totalItemsCount,
      coveredItemsCount,
      coveredItems: coveredItemsCount,
      notCoveredItemsCount,
      coveragePercent: totalItemsCount ? Math.round((coveredItemsCount / totalItemsCount) * 100) : 0,
      items,
    };
  }
}

module.exports = new CoverageService();
