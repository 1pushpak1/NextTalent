#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const crypto = require('crypto');
const fetch = global.fetch;
const connectDB = require('../config/db');
const User = require('../models/User');
const EmailLog = require('../models/EmailLog');

const API_BASE = `http://localhost:${process.env.PORT || 5001}/api`;

const run = async () => {
  await connectDB();
  const email = (process.argv[2] || `timing-test-${Date.now()}@example.com`).toLowerCase().trim();
  const password = 'Test@1234';

  let candidate = await User.findOne({ email, role: 'candidate' });
  if (!candidate) {
    candidate = await User.create({
      name: 'Timing Test Candidate',
      email,
      passwordHash: 'placeholder',
      role: 'candidate',
      status: 'awaiting_evaluation_review',
      evaluationStatus: 'pending',
      operationsStatus: 'pending',
      accountStatus: 'not_invited',
    });
  } else {
    candidate.status = 'awaiting_evaluation_review';
    candidate.evaluationStatus = 'pending';
    candidate.operationsStatus = 'pending';
    candidate.accountStatus = 'not_invited';
    candidate.accountCreationInviteSent = false;
    candidate.accountInviteToken = '';
    candidate.accountInviteExpiresAt = null;
    await candidate.save();
  }

  const token = crypto.createHash('sha256').update('timing-token').digest('hex');
  candidate.accountInviteToken = token;
  candidate.accountInviteExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);
  await candidate.save();

  const adminToken = require('jsonwebtoken').sign(
    { isEnvAdmin: true, role: 'admin', email: process.env.EVALUATION_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

  const evalRes = await fetch(`${API_BASE}/admin/candidates/${candidate._id}/evaluation/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reasonNote: 'Timing test approval' }),
  });
  console.log('Admin 2 response:', await evalRes.json());

  const logsAfterEval = await EmailLog.find({ to: email }).sort({ createdAt: -1 }).lean();
  console.log('Candidate logs after Admin 2:', logsAfterEval.map((l) => ({ templateKey: l.templateKey, status: l.status, subject: l.subject })));

  const opsToken = require('jsonwebtoken').sign(
    { isEnvAdmin: true, role: 'admin', email: process.env.OPERATIONS_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  const opsHeaders = { Authorization: `Bearer ${opsToken}`, 'Content-Type': 'application/json' };
  const opsRes = await fetch(`${API_BASE}/admin/candidates/${candidate._id}/operations/approve`, {
    method: 'POST',
    headers: opsHeaders,
    body: JSON.stringify({ reasonNote: 'Timing test approval' }),
  });
  console.log('Admin 3 response:', await opsRes.json());

  const logsAfterOps = await EmailLog.find({ to: email }).sort({ createdAt: -1 }).lean();
  console.log('Candidate logs after Admin 3:', logsAfterOps.map((l) => ({ templateKey: l.templateKey, status: l.status, subject: l.subject })));
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
