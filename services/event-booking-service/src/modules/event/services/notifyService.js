const notifyRepository = require('../repository/notifyRepository');

class NotifyService {
  async createNotifyRequest(customerId, data) {
    // 1. Enforce max 3/day customer limit per FR-NOT-02 and SRS §2.3
    const activeToday = await notifyRepository.countActiveToday(customerId);
    if (activeToday >= 3) {
      const err = new Error('Daily Notify-Me request limit reached (maximum 3 requests per day)');
      err.status = 429;
      err.code = 'RATE_LIMIT_EXCEEDED';
      err.details = [{ field: 'customerId', issue: 'Max 3 alerts per day limit exceeded' }];
      throw err;
    }

    const { targetDate, eventItemId, packageId, categoryId } = data;
    const req = await notifyRepository.createNotifyRequest({
      customerId,
      eventItemId,
      packageId,
      categoryId,
      targetDate,
    });

    const targetDateObj = new Date(targetDate);
    targetDateObj.setHours(23, 59, 59, 999);

    return {
      id: req.id,
      customerId: req.customer_id,
      targetDate: req.target_date,
      status: req.status || 'ACTIVE',
      expiresAt: targetDateObj.toISOString(),
      success: true,
    };
  }

  async listNotifyRequests(customerId) {
    const requests = await notifyRepository.findByCustomerId(customerId);
    return requests.map((req) => {
      const targetDateObj = new Date(req.target_date);
      targetDateObj.setHours(23, 59, 59, 999);
      return {
        id: req.id,
        customerId: req.customer_id,
        targetDate: req.target_date,
        status: req.status || 'ACTIVE',
        expiresAt: targetDateObj.toISOString(),
      };
    });
  }

  async cancelNotifyRequest(id, customerId) {
    const success = await notifyRepository.cancelRequest(id, customerId);
    if (!success) {
      const err = new Error(`Notify request ${id} not found or not owned by caller`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return true;
  }
}

module.exports = new NotifyService();
