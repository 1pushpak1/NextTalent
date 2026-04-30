const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true },
    country: { type: String, required: true },
    selectedDestination: { type: String, required: true },
    role: { type: String, required: true },
    text: { type: String, required: true },
    photoUrl: { type: String, default: '' },
    consent: { type: Boolean, required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Testimonial', testimonialSchema);
