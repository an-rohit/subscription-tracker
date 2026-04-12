const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { analyzeSpending, parseSubscription, chatWithAI } = require('../controllers/ai.controller');

const router = express.Router();

router.use(protect);

router.post('/analyze', analyzeSpending);
router.post('/parse-subscription', parseSubscription);
router.post('/chat', chatWithAI);

module.exports = router;