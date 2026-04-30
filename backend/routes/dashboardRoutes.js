const express = require('express');
const { getDashboard, updateMyStatus } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', protect, getDashboard);
router.put('/me/status', protect, updateMyStatus);

module.exports = router;
