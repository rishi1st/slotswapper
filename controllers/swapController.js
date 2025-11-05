// src/controllers/swapController.js
const mongoose = require('mongoose');
const Event = require('../models/Event');
const SwapRequest = require('../models/SwapRequest');

const getSwappableSlots = async (req, res) => {
  try {
    const slots = await Event.find({
      owner: { $ne: req.user._id },
      status: 'SWAPPABLE'
    })
    .populate('owner', 'name email')
    .sort({ startTime: 1 });

    res.json(slots);
  } catch (error) {
    console.error('Get swappable slots error:', error);
    res.status(500).json({ message: 'Server error fetching swappable slots' });
  }
};

const createSwapRequest = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { mySlotId, theirSlotId } = req.body;

    // Validation
    if (!mySlotId || !theirSlotId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Both slot IDs are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(mySlotId) || !mongoose.Types.ObjectId.isValid(theirSlotId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid slot IDs' });
    }

    // Find slots within transaction
    const [mySlot, theirSlot] = await Promise.all([
      Event.findOne({ _id: mySlotId }).session(session),
      Event.findOne({ _id: theirSlotId }).session(session)
    ]);

    if (!mySlot || !theirSlot) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'One or both slots not found' });
    }

    // Ownership check
    if (!mySlot.owner.equals(req.user._id)) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'You do not own the offered slot' });
    }

    // Status checks
    if (mySlot.status !== 'SWAPPABLE' || theirSlot.status !== 'SWAPPABLE') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Both slots must be swappable' });
    }

    // Check for existing pending requests
    const existingRequest = await SwapRequest.findOne({
      $or: [
        { requesterEvent: mySlotId, responderEvent: theirSlotId },
        { requesterEvent: theirSlotId, responderEvent: mySlotId }
      ],
      status: 'PENDING'
    }).session(session);

    if (existingRequest) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Swap request already exists between these slots' });
    }

    // Create swap request
    const swapRequest = new SwapRequest({
      requester: req.user._id,
      responder: theirSlot.owner,
      requesterEvent: mySlotId,
      responderEvent: theirSlotId,
      status: 'PENDING'
    });

    // Update event statuses
    mySlot.status = 'SWAP_PENDING';
    theirSlot.status = 'SWAP_PENDING';

    await mySlot.save({ session });
    await theirSlot.save({ session });
    await swapRequest.save({ session });

    await session.commitTransaction();

    // Populate and return
    const populated = await SwapRequest.findById(swapRequest._id)
      .populate('requester', 'name email')
      .populate('responder', 'name email')
      .populate('requesterEvent')
      .populate('responderEvent');

    res.status(201).json(populated);
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Create swap request error:', error);
    res.status(500).json({ message: 'Server error creating swap request' });
  } finally {
    session.endSession();
  }
};

const respondToSwap = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();

    const { requestId } = req.params;
    const { accept } = req.body;

    // Validation
    if (typeof accept !== 'boolean') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Accept field must be boolean' });
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid request ID' });
    }

    // Find swap request within transaction
    const swapRequest = await SwapRequest.findById(requestId)
      .populate('requester', 'name email')
      .populate('responder', 'name email')
      .populate('requesterEvent')
      .populate('responderEvent')
      .session(session);

    if (!swapRequest) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Swap request not found' });
    }

    // Authorization check
    if (!swapRequest.responder._id.equals(req.user._id)) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Not authorized to respond to this request' });
    }

    // Status check
    if (swapRequest.status !== 'PENDING') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Swap request already processed' });
    }

    // Find events within transaction
    const requesterEvent = await Event.findById(swapRequest.requesterEvent._id).session(session);
    const responderEvent = await Event.findById(swapRequest.responderEvent._id).session(session);

    if (!requesterEvent || !responderEvent) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'One or both events no longer exist' });
    }

    if (accept) {
      // ACCEPT SWAP
      // Verify events are still in SWAP_PENDING state
      if (requesterEvent.status !== 'SWAP_PENDING' || responderEvent.status !== 'SWAP_PENDING') {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Events are no longer available for swapping' });
      }

      // Swap owners
      const tempOwner = requesterEvent.owner;
      requesterEvent.owner = responderEvent.owner;
      responderEvent.owner = tempOwner;

      // Update statuses
      requesterEvent.status = 'BUSY';
      responderEvent.status = 'BUSY';
      swapRequest.status = 'ACCEPTED';

      await requesterEvent.save({ session });
      await responderEvent.save({ session });
      await swapRequest.save({ session });

      await session.commitTransaction();

      res.json({
        message: 'Swap accepted successfully',
        swap: swapRequest
      });

    } else {
      // REJECT SWAP
      // Reset event statuses
      requesterEvent.status = 'SWAPPABLE';
      responderEvent.status = 'SWAPPABLE';
      swapRequest.status = 'REJECTED';

      await requesterEvent.save({ session });
      await responderEvent.save({ session });
      await swapRequest.save({ session });

      await session.commitTransaction();

      res.json({
        message: 'Swap rejected successfully',
        swap: swapRequest
      });
    }
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Respond to swap error:', error);
    res.status(500).json({ message: 'Server error processing swap response' });
  } finally {
    session.endSession();
  }
};

const getIncomingRequests = async (req, res) => {
  try {
    const requests = await SwapRequest.find({ responder: req.user._id })
      .populate('requester', 'name email')
      .populate('responder', 'name email')
      .populate('requesterEvent')
      .populate('responderEvent')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Get incoming requests error:', error);
    res.status(500).json({ message: 'Server error fetching incoming requests' });
  }
};

const getOutgoingRequests = async (req, res) => {
  try {
    const requests = await SwapRequest.find({ requester: req.user._id })
      .populate('requester', 'name email')
      .populate('responder', 'name email')
      .populate('requesterEvent')
      .populate('responderEvent')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Get outgoing requests error:', error);
    res.status(500).json({ message: 'Server error fetching outgoing requests' });
  }
};

module.exports = {
  getSwappableSlots,
  createSwapRequest,
  respondToSwap,
  getIncomingRequests,
  getOutgoingRequests
};