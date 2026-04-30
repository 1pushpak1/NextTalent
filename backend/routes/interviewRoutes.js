const express = require('express');
const { getMyInterviews, addInterview } = require('../controllers/interviewController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', protect, getMyInterviews);
router.post('/', protect, adminOnly, addInterview);

module.exports = router;
