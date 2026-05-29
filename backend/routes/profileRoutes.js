const express = require('express');
const {
	createProfile,
	createPublicProfile,
	getMyProfile,
	getPublicProfile,
	updateMyProfile,
	updatePublicProfile,
	generateProfilePdf,
	downloadProfilePdf,
} = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/public', createPublicProfile);
router.get('/public', getPublicProfile);
router.put('/public', updatePublicProfile);

router.post('/', protect, createProfile);
router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.post('/generate-pdf', protect, generateProfilePdf);
router.get('/generated-pdf', protect, downloadProfilePdf);

module.exports = router;
