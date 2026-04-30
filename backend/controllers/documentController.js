const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Document = require('../models/Document');

const uploadDir = path.join(__dirname, '..', 'uploads', 'documents');

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
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File is required' });
    const { documentType } = req.body;
    if (!documentType) return res.status(400).json({ message: 'documentType is required' });

    const record = await Document.create({
      userId: req.user._id,
      documentType,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      status: 'Uploaded',
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
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { upload, uploadDocument, getMyDocuments, updateDocumentStatus };
