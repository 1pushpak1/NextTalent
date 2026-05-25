const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    documentType: { type: String, required: true },
    fileUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Uploaded', 'Under Review', 'Accepted', 'Needs Revision'],
      default: 'Uploaded',
    },
    adminComment: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
