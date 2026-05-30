#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { operationsApprove } = require('../controllers/adminApprovalController');

const run = async () => {
  await connectDB();

  // If an email provided, prefer that candidate (useful for re-runs)
  const targetEmail = process.argv[2];
  let candidate = null;
  if (targetEmail) {
    candidate = await User.findOne({ role: 'candidate', email: targetEmail.toLowerCase().trim() });
    if (candidate) {
      console.log('Using existing candidate by email:', candidate.email, candidate._id.toString());
    }
  }

  // If no specific email candidate found, find a ready candidate
  if (!candidate) {
    candidate = await User.findOne({ role: 'candidate', evaluationStatus: 'approved', status: 'evaluation_approved' }).sort({ createdAt: -1 });
  }

  if (!candidate) {
    console.log('No existing candidate found in evaluation_approved state. Creating a temp test candidate.');
    const now = new Date();
    const newEmail = targetEmail || `test-candidate-${Date.now()}@example.com`;
    candidate = new User({
      name: 'Test Candidate',
      email: newEmail.toLowerCase().trim(),
      passwordHash: 'test-hash',
      role: 'candidate',
      status: 'evaluation_approved',
      evaluationStatus: 'approved',
      evaluationApprovedBy: process.env.SUPER_ADMIN_EMAIL || 'system@local',
      evaluationApprovedAt: now,
      admin2EvaluationApproved: true,
      admin2EvaluationApprovedAt: now,
    });
    await candidate.save();
    // create a profile placeholder
    const profile = new Profile({ userId: candidate._id, status: 'accepted' });
    await profile.save();
    console.log('Created candidate:', candidate.email, candidate._id.toString());
  } else {
    console.log('Found candidate:', candidate.email, candidate._id.toString());
  }

  // Mock req/res
  const req = {
    params: { id: String(candidate._id) },
    body: { reasonNote: 'Automated admin3 approval test' },
    user: { email: process.env.SUPER_ADMIN_EMAIL || 'system@local', adminRole: 'super' },
  };

  const res = {
    statusCode: 200,
    jsonPayload: null,
    status(code) {
      this.statusCode = code; return this;
    },
    json(payload) { this.jsonPayload = payload; console.log('Controller response:', payload); return this; },
  };

  try {
    await operationsApprove(req, res);

    // Refresh candidate from DB
    const updated = await User.findById(candidate._id).lean();
    console.log('Updated candidate status:', updated.status, 'accountCreationInviteSent:', updated.accountCreationInviteSent);
    process.exit(0);
  } catch (err) {
    console.error('Error running operationsApprove:', err);
    process.exit(2);
  }
};

run();
