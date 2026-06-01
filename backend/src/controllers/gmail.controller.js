const { scanGmailForSubscriptions, getScanLogs } = require('../services/gmailScan.service');

const scanGmail = async (req, res) => {
  try {
    const result = await scanGmailForSubscriptions(req.userId);
    res.json({
      message: 'Gmail scan completed',
      ...result,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      message: 'Gmail scan failed',
      error: err.message,
    });
  }
};

const getGmailScanLogs = async (req, res) => {
  try {
    const logs = await getScanLogs(req.userId);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({
      message: 'Could not load scan logs',
      error: err.message,
    });
  }
};

const disconnectGmail = async (req, res) => {
  try {
    const prisma = require('../config/db');
    await prisma.googleToken.deleteMany({ where: { userId: req.userId } });
    res.json({ message: 'Gmail access disconnected for this app' });
  } catch (err) {
    res.status(500).json({
      message: 'Could not disconnect Gmail',
      error: err.message,
    });
  }
};

module.exports = { scanGmail, getGmailScanLogs, disconnectGmail };
