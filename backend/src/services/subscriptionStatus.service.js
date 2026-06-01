const prisma = require('../config/db');

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const expireOverdueSubscriptions = async (userId = null) => {
  const where = {
    status: { in: ['active', 'detected'] },
    nextRenewalDate: { lt: startOfToday() },
    ...(userId && { userId }),
  };

  return prisma.subscription.updateMany({
    where,
    data: { status: 'expired' },
  });
};

const cleanupInvalidDetectedSubscriptions = async (userId = null) => {
  const where = {
    status: 'detected',
    sourceMessageId: { not: null },
    cost: { lte: 0 },
    ...(userId && { userId }),
  };

  return prisma.subscription.deleteMany({ where });
};

module.exports = {
  cleanupInvalidDetectedSubscriptions,
  expireOverdueSubscriptions,
  startOfToday,
};
