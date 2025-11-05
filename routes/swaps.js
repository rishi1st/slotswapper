// src/routes/swaps.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getSwappableSlots,
  createSwapRequest,
  respondToSwap,
  getIncomingRequests,
  getOutgoingRequests
} = require('../controllers/swapController');

router.use(auth);

// marketplace
router.get('/swappable-slots', getSwappableSlots);

// create request
router.post('/swap-request', createSwapRequest);

// respond
router.post('/swap-response/:requestId', respondToSwap);

// lists
router.get('/incoming', getIncomingRequests);
router.get('/outgoing', getOutgoingRequests);

module.exports = router;
