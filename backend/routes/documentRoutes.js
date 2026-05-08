const express = require('express');
const multer = require('multer');
const { upload, uploadDocument, getMyDocuments, updateDocumentStatus } = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/upload', protect, (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Each document must be 10MB or smaller.' });
    }
    return res.status(400).json({ message: error.message || 'Upload failed' });
  });
}, uploadDocument);
router.get('/me', protect, getMyDocuments);
router.put('/:id/status', protect, updateDocumentStatus);

module.exports = router;
