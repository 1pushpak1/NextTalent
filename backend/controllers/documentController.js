const path = require('path');
const multer = require('multer');
const Document = require('../models/Document');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { buildStorageKey, storeBuffer } = require('../utils/storage');

const MAX_DOCUMENT_SIZE_BYTES = 2 * 1024 * 1024; // limit each uploaded document to 2MB
const ALLOWED_PDF_MIME_TYPES = new Set(['application/pdf']);
const DOCUMENT_UPLOAD_OPEN_STATUSES = new Set([
  'onboarding_complete',
  'documents_submitted',
  'documents_received',
  'program_payment_complete',
  'sent_to_partners',
  'interview_completed',
  'selected',
  'process_complete',
]);

const isPdfFile = (file = {}) => {
  const mimeType = String(file.mimetype || '').toLowerCase();
  const extension = String(path.extname(file.originalname || '') || '').toLowerCase();
  return ALLOWED_PDF_MIME_TYPES.has(mimeType) || extension === '.pdf';
};

const canAccessDocumentUpload = (user = {}) =>
  Boolean(user?.documentationStageInitiated) ||
  DOCUMENT_UPLOAD_OPEN_STATUSES.has(String(user?.status || '').toLowerCase());

const upload = multer({
  storage: multer.memoryStorage(),
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
    if (!user?.admin1ProgressionApproved) {
      return res.status(403).json({ message: 'Document access will unlock only after Admin 1 progression approval.' });
    }
    if (!canAccessDocumentUpload(user)) {
      return res.status(403).json({ message: 'Document upload is not available until the documentation stage opens.' });
    }
    if (profile?.status === 'rejected' || ['rejected', 'not_selected'].includes(String(user?.status || '').toLowerCase())) {
      return res.status(403).json({ message: 'This application is not active for further document submissions.' });
    }
    if (!req.file) return res.status(400).json({ message: 'File is required' });
    if (!isPdfFile(req.file)) return res.status(400).json({ message: 'Only PDF files are supported.' });
    const { documentType } = req.body;
    if (!documentType) return res.status(400).json({ message: 'documentType is required' });
    const allowedDocumentTypes = new Set([
      'Passport copy',
      'Educational qualifications',
      'Employment documents',
      'Certifications',
      'Resume/CV',
      'Language certifications (if applicable)',
      'Supporting identification records',
    ]);
    if (!allowedDocumentTypes.has(String(documentType).trim())) {
      return res.status(400).json({ message: 'Invalid documentType' });
    }

    const storageKey = buildStorageKey({
      folder: 'documents',
      subfolder: String(req.user._id || 'candidate'),
      filename: req.file.originalname,
    });
    const storedFile = await storeBuffer({
      storageKey,
      buffer: req.file.buffer,
      contentType: req.file.mimetype || 'application/pdf',
    });

    const record = await Document.create({
      userId: req.user._id,
      documentType,
      fileUrl: storedFile.fileUrl,
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
