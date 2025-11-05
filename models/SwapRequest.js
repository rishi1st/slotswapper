
const mongoose = require('mongoose');

const SWAP_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
};

const swapRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who initiated - Rishi
  responder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // owner of target slot - Rohit
  requesterEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  responderEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { type: String, enum: Object.values(SWAP_STATUS), default: SWAP_STATUS.PENDING }
}, { timestamps: true });

swapRequestSchema.statics.STATUS = SWAP_STATUS;

module.exports = mongoose.model('SwapRequest', swapRequestSchema);
