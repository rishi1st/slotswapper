// src/controllers/eventController.js
const Event = require('../models/Event');
const mongoose = require('mongoose');

const createEvent = async (req, res) => {
  try {
    const { title, startTime, endTime, status } = req.body;
    
    // Validation
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ message: 'Title, start time, and end time are required' });
    }

    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const event = new Event({
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: status || 'BUSY',
      owner: req.user._id
    });

    await event.save();
    await event.populate('owner', 'name email');
    
    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error creating event' });
  }
};

const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ owner: req.user._id })
      .populate('owner', 'name email')
      .sort({ startTime: 1 });
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error fetching events' });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const event = await Event.findById(id).populate('owner', 'name email');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check ownership
    if (!event.owner._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error fetching event' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Allowed fields to update
    const allowedUpdates = ['title', 'startTime', 'endTime', 'status'];
    allowedUpdates.forEach(field => {
      if (update[field] !== undefined) {
        event[field] = update[field];
      }
    });

    // Convert date strings if provided
    if (update.startTime) event.startTime = new Date(update.startTime);
    if (update.endTime) event.endTime = new Date(update.endTime);

    await event.save();
    await event.populate('owner', 'name email');
    
    res.json({ message: 'Event updated successfully', event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error updating event' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Event.findByIdAndDelete(id);
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error deleting event' });
  }
};

module.exports = { createEvent, getMyEvents, getEventById, updateEvent, deleteEvent };