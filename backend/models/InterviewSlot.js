const mongoose = require('mongoose');

const interviewSlotSchema = new mongoose.Schema(
  {
    adminId: { type: String, required: true },
    adminRole: { type: String, default: 'operations_admin' },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    timezone: { type: String, default: 'UTC' },
    isBooked: { type: Boolean, default: false, index: true },
    bookedByCandidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewSlot', interviewSlotSchema);
