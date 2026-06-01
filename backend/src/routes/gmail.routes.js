const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { scanGmail, getGmailScanLogs, disconnectGmail } = require('../controllers/gmail.controller');

const router = express.Router();

router.use(protect);

router.post('/scan', scanGmail);
router.get('/scan-logs', getGmailScanLogs);
router.delete('/disconnect', disconnectGmail);

module.exports = router;
