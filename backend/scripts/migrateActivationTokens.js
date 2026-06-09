#!/usr/bin/env node
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const AccountActivation = require('../models/AccountActivation');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const dryRun = process.argv.includes('--dry-run');

const normalizeEmail = (value = '') => String(value || '').toLowerCase().trim();

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in environment');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const candidates = await User.find({
      role: 'candidate',
      accountInviteToken: { $exists: true, $nin: ['', null] },
      accountInviteExpiresAt: { $ne: null },
    }).lean();

    let created = 0;
    for (const candidate of candidates) {
      const email = normalizeEmail(candidate.email);
      if (!email) continue;

      const existing = await AccountActivation.findOne({ email, tokenHash: candidate.accountInviteToken }).lean();
      if (existing) continue;

      const payload = {
        email,
        candidateName: candidate.name || '',
        tokenHash: candidate.accountInviteToken,
        expiresAt: candidate.accountInviteExpiresAt,
        usedAt: null,
        usedByUserId: null,
        issuedBy: candidate.accountCreationInviteSentAt ? 'legacy-migration' : '',
        issuedForCandidateId: String(candidate.candidateId || candidate._id || ''),
        issuedForUserId: candidate._id,
      };

      if (dryRun) {
        console.log('[dry-run] would create activation', payload);
        continue;
      }

      await AccountActivation.create(payload);
      created += 1;
    }

    console.log(dryRun ? `Dry run complete. Matched ${candidates.length} legacy candidate invites.` : `Created ${created} activation records.`);
  } catch (error) {
    console.error('Activation token migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
