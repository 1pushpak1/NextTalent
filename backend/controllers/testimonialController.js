const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Testimonial = require('../models/Testimonial');
const User = require('../models/User');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');

const uploadDir = path.join(__dirname, '..', 'uploads', 'testimonials');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const createTestimonial = async (req, res) => {
  try {
    const body = req.body || {};
    const { fullName = '', country = '', selectedDestination = '', role = '', text = '', consent, photoUrl = '' } = body;
    const uploadedPhotoUrl = req.file ? `/uploads/testimonials/${req.file.filename}` : '';

    if (String(consent) !== 'true') {
      return res.status(400).json({ message: 'Consent is required' });
    }
    if (!fullName || !country || !selectedDestination || !role || !text) {
      return res.status(400).json({ message: 'Please complete all required testimonial fields' });
    }

    const testimonial = await Testimonial.create({
      userId: req.user._id,
      fullName,
      country,
      selectedDestination,
      role,
      text,
      consent: true,
      photoUrl: uploadedPhotoUrl || photoUrl,
    });

    await User.findByIdAndUpdate(req.user._id, { status: 'process_complete' });

    await sendStepUpdateEmail({
      to: req.user?.email,
      candidateName: fullName || req.user?.name || req.user?.email?.split('@')[0],
      stepKey: 'testimonial',
      heading: 'Testimonial submitted',
      message: 'Thank you for sharing your testimonial. Your process is now marked as complete.',
      status: 'completed',
      details: [
        { label: 'Selected Destination', value: selectedDestination },
        { label: 'Country', value: country },
      ],
      cta: { label: 'Go to Dashboard', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/candidate-dashboard` },
    });

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

module.exports = { upload, createTestimonial, listTestimonials };
