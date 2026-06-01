const prisma = require('../config/db');

const CATEGORY_RULES = [
  {
    name: 'OTT',
    icon: '🎬',
    keywords: [
      'netflix', 'prime video', 'amazon prime', 'hotstar', 'disney', 'zee5',
      'sonyliv', 'jio cinema', 'jiocinema', 'youtube premium', 'hulu', 'ott',
      'streaming', 'video', 'movie', 'series',
    ],
  },
  {
    name: 'Music',
    icon: '🎵',
    keywords: [
      'spotify', 'apple music', 'youtube music', 'wynk', 'gaana', 'jiosaavn',
      'soundcloud', 'music', 'audio', 'podcast',
    ],
  },
  {
    name: 'Gaming',
    icon: '🎮',
    keywords: [
      'steam', 'xbox', 'playstation', 'epic games', 'riot', 'valorant',
      'gaming', 'game pass', 'nintendo',
    ],
  },
  {
    name: 'SaaS',
    icon: '💼',
    keywords: [
      'notion', 'figma', 'canva', 'github', 'gitlab', 'microsoft 365',
      'google workspace', 'slack', 'zoom', 'adobe', 'chatgpt', 'openai',
      'dropbox', 'drive', 'productivity', 'workspace', 'software', 'saas',
      'cloud', 'subscription plan', 'render', 'google one', 'google play',
    ],
  },
  {
    name: 'News',
    icon: '📰',
    keywords: [
      'news', 'times', 'economist', 'newspaper', 'medium', 'substack',
      'newsletter', 'magazine', 'article',
    ],
  },
  {
    name: 'Fitness',
    icon: '💪',
    keywords: [
      'cult', 'fit', 'fitness', 'gym', 'health', 'workout', 'yoga',
      'strava', 'calm', 'headspace',
    ],
  },
  {
    name: 'Finance',
    icon: '💳',
    keywords: [
      'razorpay', 'stripe', 'paypal', 'paytm', 'phonepe', 'gpay', 'upi',
      'bank', 'card', 'invoice', 'billing', 'payment', 'receipt', 'wallet',
    ],
  },
  {
    name: 'Travel',
    icon: '✈️',
    keywords: [
      'goibibo', 'makemytrip', 'air india', 'indigo', 'vistara', 'booking',
      'hotel', 'flight', 'travel', 'trip', 'airline', 'railway', 'irctc',
    ],
  },
  {
    name: 'Education',
    icon: '🎓',
    keywords: [
      'coursera', 'udemy', 'skillshare', 'duolingo', 'education', 'course',
      'learning', 'academy', 'student',
    ],
  },
];

const normalize = (value = '') => value.toString().toLowerCase();

const buildSearchText = (subscription = {}) => [
  subscription.name,
  subscription.serviceName,
  subscription.senderEmail,
  subscription.senderDomain,
  subscription.domain,
  subscription.planName,
  subscription.subject,
  subscription.bodyPreview,
].filter(Boolean).map(normalize).join(' ');

const inferSubscriptionCategory = (subscription = {}) => {
  const text = buildSearchText(subscription);

  let bestMatch = null;
  let bestScore = 0;

  CATEGORY_RULES.forEach((category) => {
    const score = category.keywords.reduce((total, keyword) => {
      return text.includes(keyword) ? total + keyword.length : total;
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  });

  return bestMatch || { name: 'Other', icon: '📦' };
};

const getOrCreateCategory = async (category) => {
  const existing = await prisma.category.findFirst({
    where: { name: { equals: category.name, mode: 'insensitive' } },
  });

  if (existing) return existing;

  return prisma.category.create({
    data: {
      name: category.name,
      icon: category.icon,
    },
  });
};

const getCategoryIdForSubscription = async (subscription) => {
  const category = inferSubscriptionCategory(subscription);
  const savedCategory = await getOrCreateCategory(category);
  return savedCategory.id;
};

const categorizeUncategorizedSubscriptions = async (userId) => {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      categoryId: null,
    },
  });

  let updated = 0;
  for (const subscription of subscriptions) {
    const categoryId = await getCategoryIdForSubscription(subscription);
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { categoryId },
    });
    updated += 1;
  }

  return { checked: subscriptions.length, updated };
};

module.exports = {
  inferSubscriptionCategory,
  getCategoryIdForSubscription,
  categorizeUncategorizedSubscriptions,
};
