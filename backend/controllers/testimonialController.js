const Testimonial = require('../models/Testimonial');
const User = require('../models/User');

const createTestimonial = async (req, res) => {
  try {
    const { fullName, country, selectedDestination, role, text, consent, photoUrl = '' } = req.body;

    if (!consent) {
      return res.status(400).json({ message: 'Consent is required' });
    }

    const testimonial = await Testimonial.create({
      userId: req.user._id,
      fullName,
      country,
      selectedDestination,
      role,
      text,
      consent,
      photoUrl,
    });

    await User.findByIdAndUpdate(req.user._id, { status: 'process_complete' });

    res.status(201).json(testimonial);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const listTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createTestimonial, listTestimonials };
