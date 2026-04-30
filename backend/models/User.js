const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: '' },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['candidate', 'admin'], default: 'candidate' },
    status: { type: String, default: 'account_created' },
    stageStatuses: { type: Map, of: String, default: {} },
    assignedHiringPartner: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
    phoneOtp: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('User', userSchema);
