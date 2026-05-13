const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Number, default: 0 },
  },
  { timestamps: false }
);

module.exports = mongoose.model('Counter', counterSchema);
