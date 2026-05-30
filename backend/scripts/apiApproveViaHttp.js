#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const fetch = global.fetch;
const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');
const User = require('../models/User');

const API_BASE = `http://localhost:${process.env.PORT || 5001}/api`;

const run = async () => {
  await connectDB();

  const email = process.argv[2] || `api-test-${Date.now()}@example.com`;
  let candidate = await User.findOne({ email: email.toLowerCase().trim() });
  if (!candidate) {
    candidate = new User({
      name: 'API Test Candidate',
      email: email.toLowerCase().trim(),
      passwordHash: 'test-hash',
      role: 'candidate',
      status: 'awaiting_evaluation_review',
      evaluationStatus: 'pending',
    });
    await candidate.save();
    console.log('Created candidate', candidate.email, candidate._id.toString());
  } else {
    console.log('Using existing candidate', candidate.email, candidate._id.toString());
  }

  // Build env-admin JWT for SUPER_ADMIN_EMAIL
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const token = jwt.sign({ isEnvAdmin: true, role: 'admin', email: adminEmail }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    const evalRes = await fetch(`${API_BASE}/admin/candidates/${candidate._id}/evaluation/approve`, {
      method: 'POST', headers, body: JSON.stringify({ reasonNote: 'Automated approval test' }),
    });
    const evalJson = await evalRes.json();
    console.log('Evaluation approve response:', evalJson);
  } catch (err) {
    console.error('Evaluation approve error:', err.message || err);
  }

  try {
      const opRes = await fetch(`${API_BASE}/admin/candidates/${candidate._id}/operations/approve`, {
        method: 'POST', headers, body: JSON.stringify({ reasonNote: 'Automated approval test' }),
    });
    const contentType = opRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const opJson = await opRes.json();
      console.log('Operations approve response:', opJson);
    } else {
      const text = await opRes.text();
      console.log('Operations approve non-JSON response:', text.slice(0, 200));
    }
  } catch (err) {
    console.error('Operations approve error:', err.message || err);
  }

  // Check email logs via internal DB
  const EmailLog = require('../models/EmailLog');
  const logs = await EmailLog.find({ to: candidate.email }).sort({ createdAt: -1 }).limit(5).lean();
  console.log('Recent EmailLogs for candidate:', logs.map(l => ({ templateKey: l.templateKey, status: l.status, sentAt: l.sentAt, errorMessage: l.errorMessage })));

  process.exit(0);
};

run();
