const express = require('express');
const { checkEligibility, getEligibilityById, claimEligibility } = require('../controllers/eligibilityController');
const { optionalAuth, protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/check', optionalAuth, checkEligibility);
router.post('/claim', protect, claimEligibility);
router.get('/:id', getEligibilityById);

module.exports = router;
