const prisma = require('../config/db');
const { expireOverdueSubscriptions } = require('./subscriptionStatus.service');

const DEFAULT_LOOKAHEAD_DAYS = Number(process.env.RENEWAL_REMINDER_DAYS || 3);
const DEFAULT_INTERVAL_MS = Number(process.env.RENEWAL_REMINDER_INTERVAL_MS || 6 * 60 * 60 * 1000);
const sentReminderKeys = new Set();

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const daysBetween = (date) => {
  const today = startOfToday();
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const getRenewUrl = (subscription) => {
  if (!subscription.domain) return null;
  if (/^https?:\/\//i.test(subscription.domain)) return subscription.domain;
  return `https://${subscription.domain}`;
};

const buildReminderMessage = (subscription) => {
  const days = daysBetween(subscription.nextRenewalDate);
  const renewUrl = getRenewUrl(subscription);
  const amount = `${subscription.currency || 'INR'} ${subscription.cost}`;

  if (days < 0) {
    return {
      subject: `${subscription.name} subscription is overdue`,
      text: [
        `${subscription.name} was due ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago.`,
        `Amount: ${amount} / ${subscription.billingCycle}`,
        renewUrl ? `Renew here: ${renewUrl}` : 'No renewal URL is saved yet.',
      ].join('\n'),
    };
  }

  if (days === 0) {
    return {
      subject: `${subscription.name} renews today`,
      text: [
        `${subscription.name} renews today.`,
        `Amount: ${amount} / ${subscription.billingCycle}`,
        renewUrl ? `Renew here: ${renewUrl}` : 'No renewal URL is saved yet.',
      ].join('\n'),
    };
  }

  return {
    subject: `${subscription.name} renews in ${days} day${days === 1 ? '' : 's'}`,
    text: [
      `${subscription.name} renews on ${new Date(subscription.nextRenewalDate).toLocaleDateString()}.`,
      `Amount: ${amount} / ${subscription.billingCycle}`,
      renewUrl ? `Renew here: ${renewUrl}` : 'No renewal URL is saved yet.',
    ].join('\n'),
  };
};

const sendEmail = async ({ to, subject, text }) => {
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!hasSmtpConfig) {
    console.log(`[renewal-email:demo] To: ${to} | ${subject}\n${text}`);
    return { mode: 'log' };
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    console.log('[renewal-email:demo] nodemailer is not installed, logging instead.');
    console.log(`[renewal-email:demo] To: ${to} | ${subject}\n${text}`);
    return { mode: 'log' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  });

  return { mode: 'smtp' };
};

const sendRenewalReminders = async () => {
  await expireOverdueSubscriptions();

  const today = startOfToday();
  const reminderWindowEnd = new Date(today);
  reminderWindowEnd.setDate(today.getDate() + DEFAULT_LOOKAHEAD_DAYS);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: ['active', 'detected', 'expired'] },
      nextRenewalDate: { lte: reminderWindowEnd },
    },
    include: { user: true },
    orderBy: { nextRenewalDate: 'asc' },
  });

  let sent = 0;

  for (const subscription of subscriptions) {
    const days = daysBetween(subscription.nextRenewalDate);
    
    // Send email ONLY at exactly 1 day remaining and exactly 0 days remaining
    if (days !== 1 && days !== 0) {
      continue;
    }

    const reminderKey = `${subscription.id}:${subscription.nextRenewalDate.toISOString()}:${days}`;

    if (sentReminderKeys.has(reminderKey)) continue;

    const message = buildReminderMessage(subscription);
    await sendEmail({
      to: subscription.user.email,
      subject: message.subject,
      text: message.text,
    });

    sentReminderKeys.add(reminderKey);
    sent += 1;
  }

  return { checked: subscriptions.length, sent };
};

const startRenewalReminderJob = () => {
  if (process.env.ENABLE_RENEWAL_EMAILS === 'false') {
    console.log('Renewal reminder email job disabled.');
    return null;
  }

  const run = async () => {
    try {
      const result = await sendRenewalReminders();
      if (result.checked > 0) {
        console.log(`Renewal reminder job checked ${result.checked}, sent/logged ${result.sent}.`);
      }
    } catch (err) {
      console.error('Renewal reminder job failed:', err.message);
    }
  };

  run();
  return setInterval(run, DEFAULT_INTERVAL_MS);
};

module.exports = {
  sendRenewalReminders,
  startRenewalReminderJob,
  getRenewUrl,
};
