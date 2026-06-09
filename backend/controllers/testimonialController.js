const multer = require('multer');
const Testimonial = require('../models/Testimonial');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { buildStorageKey, storeBuffer } = require('../utils/storage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const createTestimonial = async (req, res) => {
  try {
    const [user, profile] = await Promise.all([
      User.findById(req.user._id).lean(),
      Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
    ]);
    if (profile?.status === 'rejected' || ['rejected', 'not_selected'].includes(String(user?.status || '').toLowerCase())) {
      return res.status(403).json({ message: 'This application is not active for testimonial submission.' });
    }
    const body = req.body || {};
    const { fullName = '', country = '', selectedDestination = '', role = '', text = '', consent, photoUrl = '' } = body;

    if (String(consent) !== 'true') {
      return res.status(400).json({ message: 'Consent is required' });
    }
    if (!fullName || !country || !selectedDestination || !role || !text) {
      return res.status(400).json({ message: 'Please complete all required testimonial fields' });
    }

    let uploadedPhotoUrl = '';
    if (req.file) {
      const storageKey = buildStorageKey({
        folder: 'testimonials',
        subfolder: String(req.user._id || 'candidate'),
        filename: req.file.originalname,
      });
      const storedFile = await storeBuffer({
        storageKey,
        buffer: req.file.buffer,
        contentType: req.file.mimetype || 'application/octet-stream',
      });
      uploadedPhotoUrl = storedFile.fileUrl;
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
