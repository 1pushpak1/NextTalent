const express = require('express');
const { createTestimonial, listTestimonials } = require('../controllers/testimonialController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createTestimonial);
router.get('/', listTestimonials);

module.exports = router;
