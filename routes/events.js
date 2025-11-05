// src/routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // your middleware file name
const {
  createEvent,
  getMyEvents,
  getEventById,
  updateEvent,
  deleteEvent
} = require('../controllers/eventController');

// All routes protected
router.use(auth);

// Create
router.post('/', createEvent);

// List my events
router.get('/', getMyEvents);

// Get single event (by id)
router.get('/:id', getEventById);

// Update
router.patch('/:id', updateEvent); // PATCH is good for partial update

// Delete
router.delete('/:id', deleteEvent);

module.exports = router;
