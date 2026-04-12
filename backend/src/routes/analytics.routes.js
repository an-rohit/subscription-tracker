const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  getSummary,
  getByCategory,
  getUpcomingRenewals,
  getYearlyBreakdown,
} = require('../controllers/analytics.controller');

const router = express.Router();

router.use(protect);

router.get('/summary', getSummary);
router.get('/by-category', getByCategory);
router.get('/upcoming-renewals', getUpcomingRenewals);
router.get('/yearly', getYearlyBreakdown);

module.exports = router;