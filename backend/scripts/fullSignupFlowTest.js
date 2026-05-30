#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const crypto = require('crypto');
const fetch = global.fetch;
const User = require('../models/User');

const API_BASE = `http://localhost:${process.env.PORT || 5001}/api`;

const run = async () => {
  await connectDB();

  const email = process.argv[2] || `flow-test-${Date.now()}@example.com`;
  const password = 'Test@1234';
  let candidate = await User.findOne({ email: email.toLowerCase().trim() });
  if (!candidate) {
    candidate = new User({
      name: 'Flow Test Candidate',
      email: email.toLowerCase().trim(),
      passwordHash: 'placeholder',
      role: 'candidate',
      evaluationStatus: 'approved',
      operationsStatus: 'approved',
      status: 'account_invited',
      accountStatus: 'invited',
    });
    await candidate.save();
    console.log('Created candidate', candidate.email, candidate._id.toString());
  } else {
    console.log('Using existing candidate', candidate.email, candidate._id.toString());
    // ensure statuses
    candidate.evaluationStatus = 'approved';
    candidate.operationsStatus = 'approved';
    candidate.status = 'account_invited';
    candidate.accountStatus = 'invited';
    await candidate.save();
  }

  // Set known invite token
  const rawToken = 'TESTINVITETOKEN123';
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  candidate.accountInviteToken = tokenHash;
  candidate.accountInviteExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);
  candidate.accountCreationInviteSent = true;
  candidate.accountCreationInviteSentAt = new Date();
  await candidate.save();
  console.log('Set invite token for candidate (raw token):', rawToken);

  // Call signup API
  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: candidate.email, password, confirmPassword: password, inviteToken: rawToken }),
  });
  const signupJson = await signupRes.json();
  console.log('Signup response:', signupJson);

  // Reload user
  let user = await User.findOne({ email: candidate.email });
  console.log('Post-signup accountStatus:', user.accountStatus, 'status:', user.status);

  // Generate verification code and set on user
  const code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  user.emailVerificationTokenHash = codeHash;
  user.emailVerificationExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  console.log('Set verification code (for test):', code);

  // Call verify-email API
  const verifyRes = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, code }),
  });
  const verifyJson = await verifyRes.json();
  console.log('Verify email response:', verifyJson);

  // Final user state
  user = await User.findOne({ email: candidate.email }).lean();
  console.log('Final user state: emailVerified=', user.emailVerified, 'status=', user.status);

  process.exit(0);
};

run();
