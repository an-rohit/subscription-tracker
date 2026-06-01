const axios = require('axios');
const prisma = require('../config/db');
const { decrypt, encrypt } = require('./tokenCrypto.service');
const { getCategoryIdForSubscription } = require('./categoryAI.service');
const {
  cleanupInvalidDetectedSubscriptions,
  expireOverdueSubscriptions,
} = require('./subscriptionStatus.service');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const MAX_SCAN_RESULTS = Number(process.env.GMAIL_SCAN_LIMIT || 150);

const SEARCH_QUERY = [
  'newer_than:2y',
  '("auto-renewing subscription" OR "manage your subscriptions" OR "subscription active" OR "subscription continues" OR subject:subscription OR subject:membership OR subject:renewal OR subject:recurring OR subject:plan OR subject:billing OR subject:"Google Play Order Receipt")',
].join(' ');

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

const KEYWORDS = [
  'subscription',
  'subscribed',
  'membership',
  'premium',
  'plan',
  'invoice',
  'receipt',
  'billing',
  'renewal',
  'trial',
  'payment successful',
];

const SUBSCRIPTION_SIGNALS = [
  /subscription/i,
  /subscribed/i,
  /membership/i,
  /recurring/i,
  /renew(?:al|s|ed)?/i,
  /auto[-\s]?renew/i,
  /billing cycle/i,
  /next billing/i,
  /next payment/i,
  /monthly plan/i,
  /yearly plan/i,
  /annual plan/i,
  /premium plan/i,
  /trial (?:ends|expires)/i,
  /charged every/i,
  /billed (?:monthly|yearly|annually|weekly)/i,
];

const STRONG_SUBSCRIPTION_SIGNALS = [
  /auto[-\s]?renewing subscription/i,
  /you(?:'|’)ve been charged/i,
  /you have been charged/i,
  /subscription (?:continues|active|renewed)/i,
  /your subscription from/i,
  /manage your subscriptions/i,
  /charged to the payment method/i,
  /billed (?:monthly|yearly|annually|weekly)/i,
  /next billing/i,
  /next payment/i,
  /renews on/i,
  /renewal date/i,
];

const PROMOTIONAL_SIGNALS = [
  /free trial/i,
  /try premium/i,
  /get \d+ months/i,
  /learn more/i,
  /limited time/i,
  /offer/i,
  /coupon/i,
  /reward/i,
  /cashback/i,
  /digest/i,
  /credits on eligible/i,
  /invited you to join/i,
  /join a .*family/i,
];

const KNOWN_SUBSCRIPTION_DOMAINS = [
  'google.com',
  'googleplay-noreply@google.com',
  'tm.openai.com',
  'render.com',
  'netflix.com',
  'spotify.com',
  'hotstar.com',
  'youtube.com',
  'notion.so',
  'github.com',
  'figma.com',
  'canva.com',
  'openai.com',
];

const GENERIC_PAYMENT_DOMAINS = [
  'razorpay.com',
  'paypal.com',
  'paytm.com',
  'phonepe.com',
  'stripe.com',
];

const ONE_TIME_PURCHASE_SIGNALS = [
  /payment successful/i,
  /payment received/i,
  /receipt/i,
  /order confirmed/i,
  /booking confirmed/i,
  /ticket/i,
  /itinerary/i,
  /flight/i,
  /hotel booking/i,
  /trip/i,
];

const decodeBase64Url = (value = '') => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
};

const collectBodyParts = (payload, output = []) => {
  if (!payload) return output;
  if (payload.body?.data) output.push(decodeBase64Url(payload.body.data));
  if (payload.parts) {
    payload.parts.forEach(part => collectBodyParts(part, output));
  }
  return output;
};

const getHeader = (headers = [], name) => {
  const found = headers.find(header => header.name.toLowerCase() === name.toLowerCase());
  return found?.value || '';
};

const stripHtml = (value) => value
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#8377;|&#x20b9;/gi, '₹')
  .replace(/&pound;/gi, '£')
  .replace(/&euro;/gi, '€')
  .replace(/&dollar;/gi, '$')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeMoneyText = (value = '') => value
  .replace(/\u00a0/g, ' ')
  .replace(/&#8377;|&#x20b9;/gi, '\u20b9')
  .replace(/\u00e2\u201a\u00b9/g, '\u20b9')
  .replace(/\u00e2\u201a\u00ac/g, 'EUR')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&');

const extractSenderEmail = (fromHeader) => {
  const match = fromHeader.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  const emailMatch = fromHeader.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return emailMatch ? emailMatch[0].toLowerCase() : fromHeader.toLowerCase();
};

const extractServiceName = ({ fromHeader, subject }) => {
  const beforeEmail = fromHeader.split('<')[0].replace(/"/g, '').trim();
  if (beforeEmail && !/no-?reply|billing|receipt|support/i.test(beforeEmail)) {
    return beforeEmail;
  }

  const subjectMatch = subject.match(/(?:from|for|your)\s+([A-Z][A-Za-z0-9 &.+-]{2,30})/);
  if (subjectMatch) return subjectMatch[1].trim();

  const sender = extractSenderEmail(fromHeader);
  const domain = sender.split('@')[1]?.split('.')[0];
  return domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : 'Detected Subscription';
};

const extractAmount = (text) => {
  const patterns = [
    /(₹|Rs\.?|INR)\s?([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(\$|USD)\s?([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(€|EUR)\s?([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const symbol = match[1].toUpperCase();
      const currency = symbol.includes('RS') || symbol.includes('INR') || symbol.includes('₹')
        ? 'INR'
        : symbol.includes('USD') || symbol.includes('$')
          ? 'USD'
          : 'EUR';
      return {
        amount: Number(match[2].replace(/,/g, '')),
        currency,
      };
    }
  }

  return { amount: 0, currency: 'INR' };
};

const extractAmountStrict = (text) => {
  const normalized = text
    .replace(/\u00a0/g, ' ')
    .replace(/&#8377;|&#x20b9;/gi, '₹')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&');

  const patterns = [
    { pattern: /(₹|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i, currency: 'INR' },
    { pattern: /([0-9,]+(?:\.[0-9]{1,2})?)\s*(₹|Rs\.?|INR)\b/i, currency: 'INR', amountIndex: 1 },
    { pattern: /(\$|USD)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i, currency: 'USD' },
    { pattern: /([0-9,]+(?:\.[0-9]{1,2})?)\s*(\$|USD)\b/i, currency: 'USD', amountIndex: 1 },
    { pattern: /(€|EUR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i, currency: 'EUR' },
    { pattern: /([0-9,]+(?:\.[0-9]{1,2})?)\s*(€|EUR)\b/i, currency: 'EUR', amountIndex: 1 },
  ];

  for (const { pattern, currency, amountIndex = 2 } of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const amount = Number(match[amountIndex].replace(/,/g, ''));
    if (Number.isFinite(amount) && amount > 0) return { amount, currency };
  }

  return { amount: 0, currency: 'INR' };
};

const extractBillingCycle = (text) => {
  const lower = text.toLowerCase();
  if (/annual|yearly|per year|\/year|year/.test(lower)) return 'yearly';
  if (/weekly|per week|\/week/.test(lower)) return 'weekly';
  return 'monthly';
};

const extractAmountFromReceipt = (text) => {
  const normalized = normalizeMoneyText(text);
  const patterns = [
    { pattern: /(\u20b9|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i, currency: 'INR' },
    { pattern: /([0-9,]+(?:\.[0-9]{1,2})?)\s*(\u20b9|Rs\.?|INR)\b/i, currency: 'INR', amountIndex: 1 },
    { pattern: /(\$|USD)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i, currency: 'USD' },
    { pattern: /([0-9,]+(?:\.[0-9]{1,2})?)\s*(\$|USD)\b/i, currency: 'USD', amountIndex: 1 },
    { pattern: /(EUR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i, currency: 'EUR' },
    { pattern: /([0-9,]+(?:\.[0-9]{1,2})?)\s*(EUR)\b/i, currency: 'EUR', amountIndex: 1 },
  ];

  for (const { pattern, currency, amountIndex = 2 } of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const amount = Number(match[amountIndex].replace(/,/g, ''));
    if (Number.isFinite(amount) && amount > 0) return { amount, currency };
  }

  return { amount: 0, currency: 'INR' };
};

const parsePossibleDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const DATE_PATTERNS = [
  String.raw`\d{4}-\d{2}-\d{2}`,
  String.raw`\d{1,2}\/\d{1,2}\/\d{2,4}`,
  String.raw`(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}`,
  String.raw`\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}`,
];

const RENEWAL_DATE_CONTEXTS = [
  'next billing',
  'next payment',
  'next charge',
  'renews on',
  'renewal date',
  'will renew',
  'subscription renews',
  'billed on',
  'charged on',
  'trial ends',
  'trial expires',
];

const extractRenewalDate = (text) => {
  for (const context of RENEWAL_DATE_CONTEXTS) {
    for (const datePattern of DATE_PATTERNS) {
      const pattern = new RegExp(`${context}[\\s\\S]{0,90}?(${datePattern})`, 'i');
      const match = text.match(pattern);
      if (match) {
        const parsed = parsePossibleDate(match[1]);
        if (parsed) return parsed;
      }
    }
  }

  return null;
};

const extractAnyDate = (text) => {
  const patterns = [
    /\b(\d{4}-\d{2}-\d{2})\b/,
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/i,
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const date = new Date(match[1]);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }

  return null;
};

const addBillingCycle = (date, billingCycle) => {
  const next = new Date(date);
  if (billingCycle === 'weekly') next.setDate(next.getDate() + 7);
  else if (billingCycle === 'yearly') next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
};

const estimateNextRenewalDate = ({ explicitDate, emailDate, billingCycle }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let candidate = explicitDate || addBillingCycle(emailDate, billingCycle);
  candidate.setHours(0, 0, 0, 0);

  let guard = 0;
  while (candidate < today && guard < 60) {
    candidate = addBillingCycle(candidate, billingCycle);
    candidate.setHours(0, 0, 0, 0);
    guard += 1;
  }

  return candidate;
};

const extractPlanName = (text) => {
  const match = text.match(/\b([A-Za-z0-9 +.-]{2,30})\s+(?:plan|membership|subscription)\b/i);
  return match ? match[1].trim() : null;
};

const extractForwardedFromHeader = (text) => {
  const match = text.match(/\bFrom:\s*([^<\n]+<[^>]+>|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  return match ? match[1].trim() : null;
};

const extractReceiptServiceName = (text) => {
  const normalized = normalizeMoneyText(text);
  const itemMatch = normalized.match(/\bItem\s+Price\s+(.+?)\s+(?:\u20b9|Rs\.?|INR|\$|USD|EUR)\s*[0-9,]+(?:\.[0-9]{1,2})?/i);
  if (itemMatch) {
    return itemMatch[1]
      .replace(/\s*\([^)]*\)\s*$/g, '')
      .replace(/\b(auto-renewing subscription|total)\b.*$/i, '')
      .trim();
  }

  const premiumMatch = normalized.match(/\b([A-Z][A-Za-z0-9 +.-]{2,60}?(?:Premium|Pro|Plus|One|Music)[A-Za-z0-9 +().-]*?)\s+(?:\u20b9|Rs\.?|INR|\$|USD|EUR)\s*[0-9,]+(?:\.[0-9]{1,2})?/);
  return premiumMatch ? premiumMatch[1].replace(/\s*\([^)]*\)\s*$/g, '').trim() : null;
};

const isKnownSubscriptionSender = (senderIdentity) => {
  const target = senderIdentity.toLowerCase();
  return KNOWN_SUBSCRIPTION_DOMAINS.some(domain => {
    const normalizedDomain = domain.toLowerCase();
    return target.includes(normalizedDomain) || target.includes(normalizedDomain.split('.')[0]);
  });
};

const hasSubscriptionSignal = (text) => SUBSCRIPTION_SIGNALS.some(pattern => pattern.test(text));

const hasStrongSubscriptionSignal = (text) => STRONG_SUBSCRIPTION_SIGNALS.some(pattern => pattern.test(text));

const isPromotionalSubscriptionEmail = (text) => PROMOTIONAL_SIGNALS.some(pattern => pattern.test(text));

const extractAccountEmail = (text) => {
  const match = text.match(/\b(?:your account|account|to):\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  return match ? match[1].toLowerCase() : null;
};

const belongsToConnectedUser = (text, userEmail) => {
  const accountEmail = extractAccountEmail(text);
  return !accountEmail || accountEmail === userEmail.toLowerCase();
};

const isLikelyOneTimePayment = (text, senderDomain, serviceName) => {
  const lowerServiceName = serviceName.toLowerCase();
  const isGenericPaymentSender = GENERIC_PAYMENT_DOMAINS.some(domain => senderDomain.includes(domain));
  const hasOneTimeSignal = ONE_TIME_PURCHASE_SIGNALS.some(pattern => pattern.test(text));
  const looksLikeGenericPayment = lowerServiceName === 'payments' || lowerServiceName === 'payment';
  return (isGenericPaymentSender || looksLikeGenericPayment || hasOneTimeSignal) && !hasSubscriptionSignal(text);
};

const detectSubscription = (message, userEmail) => {
  const headers = message.payload?.headers || [];
  const subject = getHeader(headers, 'Subject');
  const fromHeader = getHeader(headers, 'From');
  const dateHeader = getHeader(headers, 'Date');
  const body = stripHtml(collectBodyParts(message.payload).join(' '));
  const searchable = `${subject} ${fromHeader} ${body}`;

  if (!KEYWORDS.some(keyword => searchable.toLowerCase().includes(keyword))) {
    return null;
  }

  const effectiveFromHeader = extractForwardedFromHeader(searchable) || fromHeader;
  const { amount, currency } = extractAmountFromReceipt(searchable);
  const senderEmail = extractSenderEmail(effectiveFromHeader);
  const senderDomain = senderEmail.split('@')[1] || '';
  const serviceName = extractReceiptServiceName(searchable) || extractServiceName({ fromHeader: effectiveFromHeader, subject });

  if (!belongsToConnectedUser(searchable, userEmail)) {
    return null;
  }

  if (!hasStrongSubscriptionSignal(searchable)) {
    return null;
  }

  if (isPromotionalSubscriptionEmail(searchable) && !/you(?:'|’)ve been charged|you have been charged|auto[-\s]?renewing subscription/i.test(searchable)) {
    return null;
  }

  if (!isKnownSubscriptionSender(`${senderEmail} ${senderDomain}`)) {
    return null;
  }

  if (!hasSubscriptionSignal(searchable)) {
    return null;
  }

  if (amount <= 0 || isLikelyOneTimePayment(searchable, senderDomain, serviceName)) {
    return null;
  }

  const emailDateRaw = dateHeader ? new Date(dateHeader) : new Date(Number(message.internalDate));
  const emailDate = Number.isNaN(emailDateRaw.getTime()) ? new Date() : emailDateRaw;
  const billingCycle = extractBillingCycle(searchable);
  const explicitRenewalDate = extractRenewalDate(searchable);
  const fallbackInvoiceDate = explicitRenewalDate ? null : extractAnyDate(searchable);
  const nextBillingDate = estimateNextRenewalDate({
    explicitDate: explicitRenewalDate,
    emailDate: fallbackInvoiceDate || emailDate,
    billingCycle,
  });

  return {
    serviceName,
    senderEmail,
    planName: extractPlanName(searchable),
    amount,
    currency,
    billingCycle,
    nextBillingDate,
    status: 'detected',
    lastDetectedEmailDate: emailDate,
    sourceMessageId: message.id,
    domain: senderDomain,
  };
};

const refreshAccessToken = async (tokenRecord) => {
  if (!tokenRecord.refreshToken) {
    throw new Error('Google refresh token is missing. Reconnect Gmail access.');
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: decrypt(tokenRecord.refreshToken),
    grant_type: 'refresh_token',
  });

  const res = await axios.post(GOOGLE_TOKEN_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const tokenExpiry = res.data.expires_in
    ? new Date(Date.now() + res.data.expires_in * 1000)
    : null;

  await prisma.googleToken.update({
    where: { id: tokenRecord.id },
    data: {
      accessToken: encrypt(res.data.access_token),
      tokenExpiry,
    },
  });

  return res.data.access_token;
};

const toGmailApiError = (err) => {
  const googleError = err.response?.data?.error;
  const details = googleError?.details || [];
  const reason = details.find(item => item.reason)?.reason
    || googleError?.errors?.[0]?.reason;

  if (err.response?.status === 403 && reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT') {
    const scopedError = new Error(
      `Gmail permission is missing. Reconnect Google and allow ${GMAIL_READONLY_SCOPE}.`
    );
    scopedError.statusCode = 403;
    return scopedError;
  }

  if (err.response?.status === 403) {
    const forbiddenError = new Error(
      googleError?.message || 'Gmail API denied access. Check Gmail API, OAuth consent, and test user settings.'
    );
    forbiddenError.statusCode = 403;
    return forbiddenError;
  }

  if (err.response?.status === 401) {
    const authError = new Error('Google session expired. Reconnect Gmail access and try again.');
    authError.statusCode = 401;
    return authError;
  }

  return err;
};

const getValidAccessToken = async (userId) => {
  const tokenRecord = await prisma.googleToken.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  if (!tokenRecord) {
    throw new Error('Gmail is not connected for this user.');
  }

  const hasExpired = tokenRecord.tokenExpiry && tokenRecord.tokenExpiry.getTime() < Date.now() + 60000;
  if (hasExpired) return refreshAccessToken(tokenRecord);
  return decrypt(tokenRecord.accessToken);
};

const fetchMatchedMessages = async (accessToken) => {
  let listRes;
  try {
    listRes = await axios.get(`${GMAIL_API}/messages`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        q: SEARCH_QUERY,
        maxResults: MAX_SCAN_RESULTS,
      },
    });
  } catch (err) {
    throw toGmailApiError(err);
  }

  const messages = listRes.data.messages || [];
  const detailed = [];

  for (const message of messages) {
    try {
      const res = await axios.get(`${GMAIL_API}/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { format: 'full' },
      });
      detailed.push(res.data);
    } catch (err) {
      throw toGmailApiError(err);
    }
  }

  return detailed;
};

const fetchMessageById = async (accessToken, messageId) => {
  const res = await axios.get(`${GMAIL_API}/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { format: 'full' },
  });
  return res.data;
};

const enrichMissingAmount = async (accessToken, detected) => {
  if (detected.amount > 0 || !detected.senderEmail) return detected;

  const q = [
    'newer_than:2y',
    `from:${detected.senderEmail}`,
    '(subject:invoice OR subject:receipt OR subject:payment OR subject:billing OR subject:renewal OR subject:subscription)',
  ].join(' ');

  try {
    const listRes = await axios.get(`${GMAIL_API}/messages`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { q, maxResults: 10 },
    });

    const messages = listRes.data.messages || [];
    for (const message of messages) {
      const detail = await fetchMessageById(accessToken, message.id);
      const headers = detail.payload?.headers || [];
      const subject = getHeader(headers, 'Subject');
      const fromHeader = getHeader(headers, 'From');
      const body = stripHtml(collectBodyParts(detail.payload).join(' '));
      const searchable = `${subject} ${fromHeader} ${body}`;

      if (!hasSubscriptionSignal(searchable) && !searchable.toLowerCase().includes(detected.serviceName.toLowerCase())) {
        continue;
      }

      const amount = extractAmountFromReceipt(searchable);
      if (amount.amount > 0) {
        return {
          ...detected,
          amount: amount.amount,
          currency: amount.currency,
        };
      }
    }
  } catch (err) {
    console.warn(`Could not enrich amount for ${detected.serviceName}: ${err.message}`);
  }

  return detected;
};

const saveDetectedSubscription = async (userId, detected) => {
  const existing = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['detected', 'expired'] },
      OR: [
        { sourceMessageId: detected.sourceMessageId },
        {
          name: detected.serviceName,
          senderEmail: detected.senderEmail,
        },
      ],
    },
  });

  const existingAmount = existing ? Number(existing.cost) : 0;
  const detectedAmount = Number.isFinite(detected.amount) ? detected.amount : 0;
  const safeAmount = detectedAmount > 0 ? detectedAmount : existingAmount;

  if (safeAmount <= 0) {
    if (existing) {
      await prisma.subscription.delete({ where: { id: existing.id } });
    }
    return null;
  }
  const nextDate = detected.nextBillingDate;
  const data = {
    userId,
    name: detected.serviceName,
    cost: safeAmount,
    billingCycle: detected.billingCycle,
    nextRenewalDate: nextDate,
    currency: detected.currency,
    status: detected.status,
    domain: detected.domain || null,
    senderEmail: detected.senderEmail,
    planName: detected.planName,
    lastDetectedEmailDate: detected.lastDetectedEmailDate,
    sourceMessageId: detected.sourceMessageId,
  };

  data.categoryId = await getCategoryIdForSubscription({
    ...detected,
    name: detected.serviceName,
  });

  if (existing) {
    return prisma.subscription.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.subscription.create({ data });
};

const scanGmailForSubscriptions = async (userId) => {
  await expireOverdueSubscriptions(userId);
  await cleanupInvalidDetectedSubscriptions(userId);

  const scanLog = await prisma.emailScanLog.create({
    data: { userId, status: 'running' },
  });

  try {
    const accessToken = await getValidAccessToken(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const messages = await fetchMatchedMessages(accessToken);
    const detected = messages
      .map(message => detectSubscription(message, user?.email || ''))
      .filter(Boolean);

    const savedSubscriptions = new Map();
    let skippedMissingAmount = 0;

    for (const subscription of detected) {
      const enriched = await enrichMissingAmount(accessToken, subscription);
      const saved = await saveDetectedSubscription(userId, enriched);
      if (saved) savedSubscriptions.set(saved.id, saved);
      else skippedMissingAmount += 1;
    }

    const uniqueSavedSubscriptions = Array.from(savedSubscriptions.values());

    await prisma.emailScanLog.update({
      where: { id: scanLog.id },
      data: {
        status: 'completed',
        scanCompletedAt: new Date(),
        emailsScanned: messages.length,
        subscriptionsFound: uniqueSavedSubscriptions.length,
      },
    });

    return {
      emailsScanned: messages.length,
      subscriptionsFound: uniqueSavedSubscriptions.length,
      skippedMissingAmount,
      subscriptions: uniqueSavedSubscriptions,
    };
  } catch (err) {
    await prisma.emailScanLog.update({
      where: { id: scanLog.id },
      data: {
        status: 'failed',
        scanCompletedAt: new Date(),
        errorMessage: err.message,
      },
    });
    throw err;
  }
};

const getScanLogs = async (userId) => prisma.emailScanLog.findMany({
  where: { userId },
  orderBy: { scanStartedAt: 'desc' },
  take: 5,
});

module.exports = { scanGmailForSubscriptions, getScanLogs };
