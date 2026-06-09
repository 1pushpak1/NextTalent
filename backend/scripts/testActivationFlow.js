#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fetch = global.fetch;
const User = require('../models/User');
const AccountActivation = require('../models/AccountActivation');
const { createActivationForCandidate } = require('../utils/accountActivation');
const connectDB = require('../config/db');

const API_BASE = `http://localhost:${process.env.PORT || 5001}/api`;

const run = async () => {
  await connectDB();

  const email = (process.argv[2] || `activation-test-${Date.now()}@example.com`).toLowerCase().trim();
  const password = 'Test@1234!';

  let candidate = await User.findOne({ email, role: 'candidate' });
  if (!candidate) {
    candidate = await User.create({
      name: 'Activation Flow Candidate',
      email,
      role: 'candidate',
      status: 'fully_approved',
      evaluationStatus: 'approved',
      operationsStatus: 'approved',
      accountStatus: 'invited',
      emailVerified: false,
      phoneVerified: false,
    });
  } else {
    candidate.status = 'fully_approved';
    candidate.evaluationStatus = 'approved';
    candidate.operationsStatus = 'approved';
    candidate.accountStatus = 'invited';
    candidate.passwordHash = '';
    candidate.emailVerified = false;
    candidate.phoneVerified = false;
    await candidate.save();
  }

  await AccountActivation.deleteMany({ email });
  const { token: rawToken } = await createActivationForCandidate({
    email,
    candidateName: candidate.name,
    issuedBy: 'test-script',
    issuedForCandidateId: String(candidate._id),
    issuedForUserId: candidate._id,
  });

  const validateRes = await fetch(`${API_BASE}/auth/account-activation?email=${encodeURIComponent(email)}&token=${encodeURIComponent(rawToken)}`);
  const validateJson = await validateRes.json();
  console.log('Validate before signup:', validateRes.status, validateJson);

  const validateResAgain = await fetch(`${API_BASE}/auth/account-activation?email=${encodeURIComponent(email)}&token=${encodeURIComponent(rawToken)}`);
  const validateJsonAgain = await validateResAgain.json();
  console.log('Validate again before signup:', validateResAgain.status, validateJsonAgain);

  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      confirmPassword: password,
      inviteToken: rawToken,
    }),
  });
  const signupJson = await signupRes.json();
  console.log('Signup:', signupRes.status, signupJson);

  const activationAfter = await AccountActivation.findOne({ email }).lean();
  console.log('Activation usedAt:', activationAfter?.usedAt || null);

  const secondSignupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      confirmPassword: password,
      inviteToken: rawToken,
    }),
  });
  const secondSignupJson = await secondSignupRes.json();
  console.log('Second signup:', secondSignupRes.status, secondSignupJson);

  const user = await User.findOne({ email }).lean();
  console.log('Final user state:', {
    hasPassword: Boolean(user?.passwordHash),
    accountStatus: user?.accountStatus,
    status: user?.status,
  });

  await mongoose.connection.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
