const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
} = require('../controllers/subscription.controller');

const router = express.Router();

router.use(protect); // all routes below require JWT

router.post('/', createSubscription);
router.get('/', getSubscriptions);
router.get('/:id', getSubscriptionById);
router.put('/:id', updateSubscription);
router.delete('/:id', deleteSubscription);

module.exports = router;