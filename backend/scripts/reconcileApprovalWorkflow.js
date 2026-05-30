const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');

dotenv.config();

const dryRun = process.argv.includes('--dry-run');

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is missing in environment');
  process.exit(1);
}

const normalize = (value) => String(value || '').toLowerCase();

const shouldClearInviteState = (candidate) => !['created', 'email_verified'].includes(normalize(candidate.accountStatus));

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const candidates = await User.find({
      role: 'candidate',
      evaluationStatus: 'approved',
      operationsStatus: 'pending',
    });

    let updatedCount = 0;

    for (const candidate of candidates) {
      const updatePayload = {
        status: candidate.status === 'account_created' || candidate.status === 'email_verified' ? candidate.status : 'evaluation_approved',
        operationsStatus: 'pending',
      };

      if (shouldClearInviteState(candidate)) {
        updatePayload.accountStatus = 'not_invited';
        updatePayload.accountInviteToken = '';
        updatePayload.accountInviteExpiresAt = null;
        updatePayload.accountCreationInviteSent = false;
        updatePayload.accountCreationInviteSentAt = null;
      }

      if (dryRun) {
        console.log('[dry-run] would reconcile candidate', {
          id: String(candidate._id),
          email: candidate.email,
          currentStatus: candidate.status,
          accountStatus: candidate.accountStatus,
          updatePayload,
        });
        continue;
      }

      await User.updateOne({ _id: candidate._id }, { $set: updatePayload });
      updatedCount += 1;
    }

    console.log(dryRun ? `Dry run complete. Matched ${candidates.length} candidates.` : `Reconciled ${updatedCount} candidates.`);
  } catch (error) {
    console.error('Failed to reconcile approval workflow:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();