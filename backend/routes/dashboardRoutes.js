const express = require('express');
const { getDashboard, updateMyStatus, completeDeclarationConsent } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', protect, getDashboard);
router.put('/me/status', protect, updateMyStatus);
router.post('/me/declaration-consent', protect, completeDeclarationConsent);

module.exports = router;
