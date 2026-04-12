const prisma = require('../config/db');

// POST /api/subscriptions
const createSubscription = async (req, res) => {
  try {
    const { name, cost, billingCycle, nextRenewalDate, categoryId, currency, domain } = req.body;
    if (!name || !cost || !billingCycle || !nextRenewalDate) {
      return res.status(400).json({ message: 'Name, cost, billing cycle and renewal date are required' });
    }

    const subscription = await prisma.subscription.create({
  data: {
    userId: req.userId,
    name,
    cost: parseFloat(cost),
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
    const { name, cost, billingCycle, nextRenewalDate, categoryId, currency, status } = req.body;

    const existing = await prisma.subscription.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const updated = await prisma.subscription.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(cost && { cost: parseFloat(cost) }),
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