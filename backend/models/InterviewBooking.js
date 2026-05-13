const mongoose = require('mongoose');

const interviewBookingSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    adminId: { type: String, required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSlot', required: true, unique: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    timezone: { type: String, default: 'UTC' },
    status: { type: String, enum: ['booked', 'cancelled', 'completed', 'no_show'], default: 'booked' },
    meetingLink: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewBooking', interviewBookingSchema);
