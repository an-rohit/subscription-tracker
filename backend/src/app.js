const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes         = require('./routes/auth.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const analyticsRoutes    = require('./routes/analytics.routes');
const aiRoutes           = require('./routes/ai.routes');
const gmailRoutes        = require('./routes/gmail.routes');
const { startRenewalReminderJob } = require('./services/renewalReminder.service');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://sub-hive.netlify.app',
  ],
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth',          authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/gmail',         gmailRoutes);
app.get('/', (req, res) => {
  res.json({ message: 'Subscription Tracker API is running' });
});

app.get('/ping', (req, res) => {
  res.json({ status: 'alive' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startRenewalReminderJob();
});
