
const mongoose = require('mongoose');

const EVENT_STATUS = {
  BUSY: 'BUSY',
  SWAPPABLE: 'SWAPPABLE',
  SWAP_PENDING: 'SWAP_PENDING',
};

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: Object.values(EVENT_STATUS), default: EVENT_STATUS.BUSY },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

eventSchema.statics.STATUS = EVENT_STATUS;

module.exports = mongoose.model('Event', eventSchema);
