const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Document = require('../models/Document');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');

const uploadDir = path.join(__dirname, '..', 'uploads', 'documents');
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_PDF_MIME_TYPES = new Set(['application/pdf']);

const isPdfFile = (file = {}) => {
  const mimeType = String(file.mimetype || '').toLowerCase();
  const extension = String(path.extname(file.originalname || '') || '').toLowerCase();
  return ALLOWED_PDF_MIME_TYPES.has(mimeType) || extension === '.pdf';
};

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
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!isPdfFile(file)) {
      return cb(new Error('Only PDF files are supported.'));
    }
    return cb(null, true);
  },
});

const uploadDocument = async (req, res) => {
  try {
    const [user, profile] = await Promise.all([
      User.findById(req.user._id).lean(),
      Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
    ]);
    if (profile?.status === 'rejected' || ['rejected', 'not_selected'].includes(String(user?.status || '').toLowerCase())) {
      return res.status(403).json({ message: 'This application is not active for further document submissions.' });
    }
    if (!req.file) return res.status(400).json({ message: 'File is required' });
    if (!isPdfFile(req.file)) return res.status(400).json({ message: 'Only PDF files are supported.' });
    const { documentType } = req.body;
    if (!documentType) return res.status(400).json({ message: 'documentType is required' });

    const record = await Document.create({
      userId: req.user._id,
      documentType,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      status: 'Uploaded',
    });

    await sendStepUpdateEmail({
      to: req.user?.email,
      candidateName: req.user?.name || req.user?.email?.split('@')[0],
      stepKey: 'documents',
      heading: 'Document uploaded',
      message: 'Your document has been uploaded successfully.',
      status: 'uploaded',
      details: [
        { label: 'Document Type', value: documentType },
        { label: 'Review Status', value: 'Uploaded' },
      ],
      cta: { label: 'View Documents', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/documents` },
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.user._id }).sort({ uploadedAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateDocumentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }
    const doc = await Document.findOneAndUpdate(query, { status }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const owner = await User.findById(doc.userId).lean();
    await sendStepUpdateEmail({
      to: owner?.email,
      candidateName: owner?.name || owner?.email?.split('@')[0],
      stepKey: 'document_verification',
      heading: 'Document status updated',
      message: 'A document review status has been updated by the team.',
      status: String(status || '').toLowerCase().replaceAll(' ', '_'),
      details: [
        { label: 'Document Type', value: doc.documentType || 'Document' },
        { label: 'New Status', value: status },
      ],
      cta: { label: 'Open Documents', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/documents` },
    });

    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { upload, uploadDocument, getMyDocuments, updateDocumentStatus };
