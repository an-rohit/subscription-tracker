const prisma = require('../config/db');
const {
  cleanupInvalidDetectedSubscriptions,
  expireOverdueSubscriptions,
} = require('../services/subscriptionStatus.service');

const visibleSubscriptionStatuses = ['active', 'detected'];
const visibleStatusFilter = { in: visibleSubscriptionStatuses };
const reminderStatusFilter = { in: ['active', 'detected', 'expired'] };

// GET /api/analytics/summary
const getSummary = async (req, res) => {
  try {
    await expireOverdueSubscriptions(req.userId);
    await cleanupInvalidDetectedSubscriptions(req.userId);

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.userId, status: visibleStatusFilter },
    });

    let monthlyTotal = 0;

    subscriptions.forEach(sub => {
      if (sub.billingCycle === 'monthly') {
        monthlyTotal += parseFloat(sub.cost);
      } else if (sub.billingCycle === 'yearly') {
        monthlyTotal += parseFloat(sub.cost) / 12;
      } else if (sub.billingCycle === 'weekly') {
        monthlyTotal += parseFloat(sub.cost) * 4;
      }
    });

    const yearlyTotal = monthlyTotal * 12;

    res.json({
      totalActiveSubscriptions: subscriptions.length,
      estimatedMonthlySpend: parseFloat(monthlyTotal.toFixed(2)),
      estimatedYearlySpend: parseFloat(yearlyTotal.toFixed(2)),
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/analytics/by-category
const getByCategory = async (req, res) => {
  try {
    await expireOverdueSubscriptions(req.userId);
    await cleanupInvalidDetectedSubscriptions(req.userId);

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.userId, status: visibleStatusFilter },
      include: { category: true },
    });

    const categoryMap = {};

    subscriptions.forEach(sub => {
      const categoryName = sub.category ? sub.category.name : 'Uncategorized';
      const icon = sub.category ? sub.category.icon : '📦';

      let monthlyCost = parseFloat(sub.cost);
      if (sub.billingCycle === 'yearly') monthlyCost = monthlyCost / 12;
      if (sub.billingCycle === 'weekly') monthlyCost = monthlyCost * 4;

      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          category: categoryName,
          icon,
          totalMonthly: 0,
          count: 0,
          subscriptions: [],
        };
      }

      categoryMap[categoryName].totalMonthly += monthlyCost;
      categoryMap[categoryName].count += 1;
      categoryMap[categoryName].subscriptions.push(sub.name);
    });

    const result = Object.values(categoryMap).map(c => ({
      ...c,
      totalMonthly: parseFloat(c.totalMonthly.toFixed(2)),
    }));

    res.json({ byCategory: result });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/analytics/upcoming-renewals
const getUpcomingRenewals = async (req, res) => {
  try {
    await expireOverdueSubscriptions(req.userId);
    await cleanupInvalidDetectedSubscriptions(req.userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);

    const upcoming = await prisma.subscription.findMany({
      where: {
        userId: req.userId,
        status: reminderStatusFilter,
        nextRenewalDate: {
          lte: next7Days,
        },
      },
      include: { category: true },
      orderBy: { nextRenewalDate: 'asc' },
    });

    res.json({
      count: upcoming.length,
      upcomingRenewals: upcoming,
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/analytics/yearly
const getYearlyBreakdown = async (req, res) => {
  try {
    await expireOverdueSubscriptions(req.userId);
    await cleanupInvalidDetectedSubscriptions(req.userId);

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.userId, status: visibleStatusFilter },
    });

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const breakdown = months.map(month => ({ month, amount: 0 }));

    subscriptions.forEach(sub => {
      let monthlyCost = parseFloat(sub.cost);
      if (sub.billingCycle === 'yearly') monthlyCost = monthlyCost / 12;
      if (sub.billingCycle === 'weekly') monthlyCost = monthlyCost * 4;

      breakdown.forEach(m => {
        m.amount += monthlyCost;
      });
    });

    breakdown.forEach(m => {
      m.amount = parseFloat(m.amount.toFixed(2));
    });

    res.json({ yearlyBreakdown: breakdown });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  getSummary,
  getByCategory,
  getUpcomingRenewals,
  getYearlyBreakdown,
};
