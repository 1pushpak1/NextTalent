const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hiringPartner: { type: String, required: true },
    country: { type: String, required: true },
    role: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    meetingLink: { type: String, default: '' },
    status: { type: String, default: 'Scheduled' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Interview', interviewSchema);
