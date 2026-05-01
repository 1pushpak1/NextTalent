const express = require('express');
const multer = require('multer');
const { upload, createTestimonial, listTestimonials } = require('../controllers/testimonialController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, (req, res, next) => {
  upload.single('photo')(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Photo must be 10MB or smaller' });
    }
    if (error) {
      return res.status(400).json({ message: error.message || 'Photo upload failed' });
    }
    return createTestimonial(req, res, next);
  });
});
router.get('/', listTestimonials);

module.exports = router;
