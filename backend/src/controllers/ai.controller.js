const prisma = require('../config/db');
const { callAI } = require('../services/ai.service');

const analyzeSpending = async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.userId, status: 'active' },
      include: { category: true },
    });

    if (subscriptions.length === 0) {
      return res.json({ insight: 'You have no active subscriptions to analyze.' });
    }

    const subList = subscriptions.map(s =>
      `${s.name} - ₹${s.cost} (${s.billingCycle}) - Category: ${s.category?.name || 'Uncategorized'}`
    ).join('\n');

    let monthlyTotal = 0;
    subscriptions.forEach(s => {
      if (s.billingCycle === 'monthly') monthlyTotal += parseFloat(s.cost);
      else if (s.billingCycle === 'yearly') monthlyTotal += parseFloat(s.cost) / 12;
      else if (s.billingCycle === 'weekly') monthlyTotal += parseFloat(s.cost) * 4;
    });

    const systemPrompt = `You are a personal finance advisor specializing in subscription management. 
    Analyze the user's subscriptions and give short, actionable advice in 3-4 sentences. 
    Be specific, friendly, and mention actual subscription names. 
    Focus on overspending, unused services, and money-saving opportunities.`;

    const userMessage = `Here are my active subscriptions:\n${subList}\n\nEstimated monthly total: ₹${monthlyTotal.toFixed(2)}\n\nPlease analyze my spending and give me personalized advice.`;

    const insight = await callAI(systemPrompt, userMessage);

    res.json({ insight, monthlyTotal: parseFloat(monthlyTotal.toFixed(2)) });

  } catch (err) {
    res.status(404).json({ message: 'AI error', error: err.message });
  }
};

const parseSubscription = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text input is required' });
    }

    // Try AI first
    try {
      const systemPrompt = `You are a subscription parser. Extract subscription details from natural language.
      Always respond with ONLY a valid JSON object in this exact format:
      {
        "name": "service name",
        "cost": 499,
        "billingCycle": "monthly",
        "nextRenewalDate": "2026-05-01",
        "currency": "INR",
        "domain": "example.com"
      }
      billingCycle must be one of: monthly, yearly, weekly.
      nextRenewalDate should be approximately 1 billing cycle from today (today is ${new Date().toISOString().split('T')[0]}).
      Try to guess the domain from the service name (e.g. Netflix -> netflix.com).
      If currency is not mentioned, default to INR.
      Respond with ONLY the JSON, no extra text.`;

      const userMessage = `Parse this subscription: "${text}"`;
      const raw = await callAI(systemPrompt, userMessage);
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return res.json({ message: 'Subscription parsed successfully', parsed });

    } catch (aiErr) {
      // AI failed — use regex fallback parser
      console.log('AI failed, using regex fallback parser');

      const lower = text.toLowerCase();

      // Extract cost — look for numbers
      const costMatch = text.match(/(\d+(\.\d+)?)/);
      const cost = costMatch ? parseFloat(costMatch[1]) : 0;

      // Extract billing cycle
      let billingCycle = 'monthly';
      if (lower.includes('year') || lower.includes('annual')) billingCycle = 'yearly';
      if (lower.includes('week')) billingCycle = 'weekly';

      // Extract name — first word(s) before the number
      const nameMatch = text.match(/^([a-zA-Z\s]+)/);
      const name = nameMatch ? nameMatch[1].trim() : text.split(' ')[0];

      // Guess next renewal date
      const nextDate = new Date();
      if (billingCycle === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      if (billingCycle === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
      if (billingCycle === 'weekly') nextDate.setDate(nextDate.getDate() + 7);

      const parsed = {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        cost,
        billingCycle,
        nextRenewalDate: nextDate.toISOString().split('T')[0],
        currency: 'INR',
        domain: '',
      };

      return res.json({
        message: 'Parsed using fallback (AI unavailable)',
        parsed,
        fallback: true,
      });
    }

  } catch (err) {
    res.status(500).json({ message: 'Could not parse subscription', error: err.message });
  }
};

const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.userId, status: 'active' },
      include: { category: true },
    });

    const subList = subscriptions.length > 0
      ? subscriptions.map(s => `${s.name} - ₹${s.cost} (${s.billingCycle})`).join('\n')
      : 'No active subscriptions';

    const systemPrompt = `You are a helpful personal finance assistant for a subscription tracker app.
    The user's current active subscriptions are:
    ${subList}
    Answer the user's questions about their subscriptions, spending habits, and financial advice.
    Keep responses concise (2-3 sentences max). Be friendly and specific.`;

    const reply = await callAI(systemPrompt, message);

    res.json({ reply });

  } catch (err) {
    res.status(500).json({ message: 'AI error', error: err.message });
  }
};

module.exports = { analyzeSpending, parseSubscription, chatWithAI };