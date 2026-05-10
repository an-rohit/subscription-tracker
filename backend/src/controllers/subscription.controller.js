const prisma = require('../config/db');

const parsePositiveCost = (cost) => {
  const parsedCost = Number(cost);
  return Number.isFinite(parsedCost) && parsedCost > 0 ? parsedCost : null;
};

// POST /api/subscriptions
const createSubscription = async (req, res) => {
  try {
    const { name, cost, billingCycle, nextRenewalDate, categoryId, currency, domain } = req.body;
    if (!name || cost === undefined || cost === '' || !billingCycle || !nextRenewalDate) {
      return res.status(400).json({ message: 'Name, cost, billing cycle and renewal date are required' });
    }

    const parsedCost = parsePositiveCost(cost);
    if (parsedCost === null) {
      return res.status(400).json({ message: 'Cost must be a positive amount' });
    }

    const subscription = await prisma.subscription.create({
  data: {
    userId: req.userId,
    name,
    cost: parsedCost,
    billingCycle,
    nextRenewalDate: new Date(nextRenewalDate),
    categoryId: categoryId ? parseInt(categoryId) : null,
    currency: currency || 'INR',
    domain: domain || null,
  },
  include: { category: true },
});

    res.status(201).json({
      message: 'Subscription added successfully',
      subscription,
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/subscriptions
const getSubscriptions = async (req, res) => {
  try {
    const { status, categoryId, search } = req.query;

    const filters = { userId: req.userId };

    if (status) filters.status = status;
    if (categoryId) filters.categoryId = parseInt(categoryId);
    if (search) filters.name = { contains: search, mode: 'insensitive' };

    const subscriptions = await prisma.subscription.findMany({
      where: filters,
      include: { category: true },
      orderBy: { nextRenewalDate: 'asc' },
    });

    res.json({ subscriptions });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/subscriptions/:id
const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.userId,
      },
      include: { category: true },
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.json({ subscription });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /api/subscriptions/:id
const updateSubscription = async (req, res) => {
  try {
const { name, cost, billingCycle, nextRenewalDate, categoryId, currency, status, domain } = req.body;
    const existing = await prisma.subscription.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const parsedCost = cost !== undefined && cost !== '' ? parsePositiveCost(cost) : undefined;
    if (cost !== undefined && cost !== '' && parsedCost === null) {
      return res.status(400).json({ message: 'Cost must be a positive amount' });
    }

    const updated = await prisma.subscription.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(parsedCost !== undefined && { cost: parsedCost }),
        ...(billingCycle && { billingCycle }),
        ...(nextRenewalDate && { nextRenewalDate: new Date(nextRenewalDate) }),
        ...(categoryId && { categoryId: parseInt(categoryId) }),
        ...(currency && { currency }),
        ...(domain !== undefined && { domain }),
        ...(status && { status }),
      },
      include: { category: true },
    });

    res.json({ message: 'Subscription updated successfully', subscription: updated });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/subscriptions/:id
const deleteSubscription = async (req, res) => {
  try {
    const existing = await prisma.subscription.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    await prisma.subscription.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({ message: 'Subscription deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
};
