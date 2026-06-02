const Eligibility = require('../models/Eligibility');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { runEligibilityCheck } = require('../utils/eligibilityRules');

const checkEligibility = async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const fullName = String(req.body?.fullName || email.split('@')[0] || 'Candidate').trim();
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const payload = {
      destination: String(req.body?.destination || '').trim(),
      country: String(req.body?.country || '').trim(),
      hasITBackground: Boolean(req.body?.hasITBackground),
      qualification: String(req.body?.qualification || '').trim(),
      languageAnswer: String(req.body?.languageAnswer || '').trim(),
      currentLocation: String(req.body?.currentLocation || '').trim(),
      willingToRelocate:
        typeof req.body?.willingToRelocate === 'boolean' ? req.body.willingToRelocate : null,
      comfortableWithFees:
        typeof req.body?.comfortableWithFees === 'boolean' ? req.body.comfortableWithFees : null,
    };

    const result = runEligibilityCheck(payload);

    const record = await Eligibility.create({
      userId: req.user?._id || null,
      fullName,
      email,
      destination: payload.destination,
      country: payload.country,
      hasITBackground: payload.hasITBackground,
      qualification: payload.qualification,
      languageAnswer: payload.languageAnswer,
      currentLocation: payload.currentLocation,
      willingToRelocate: payload.willingToRelocate,
      comfortableWithFees: payload.comfortableWithFees,
      isEligible: result.isEligible,
      rejectionReason: result.rejectionReason,
      failedConditions: result.failedConditions,
    });

    if (result.isEligible) {
      // Acceptance email suppressed: do not send the post-eligibility approval email.
      // Per request, no automated email should be sent immediately after initial eligibility.
    } else {
      // Sending automated eligibility rejection emails has been disabled.
      // Per request, do not send automated "Eligibility Result" emails to candidates.
      // If you need this re-enabled in future, consider toggling via an environment flag
      // (e.g., `SEND_ELIGIBILITY_EMAILS=true`) and restoring the `sendStepUpdateEmail` call.
    }

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEligibilityById = async (req, res) => {
  try {
    const record = await Eligibility.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const claimEligibility = async (req, res) => {
  try {
    const { eligibilityId } = req.body;
    let record = null;

    if (eligibilityId) {
      record = await Eligibility.findById(eligibilityId);
    } else {
      record = await Eligibility.findOne({ isEligible: true, userId: null }).sort({ createdAt: -1 });
    }

    if (!record) {
      return res.status(404).json({ message: 'Eligible record not found to claim' });
    }

    if (!record.isEligible) {
      return res.status(400).json({ message: 'Only eligible records can be claimed' });
    }

    if (record.userId && String(record.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Eligibility record belongs to another account' });
    }

    record.userId = req.user._id;
    await record.save();

    res.json({ message: 'Eligibility linked to account', eligibility: record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { checkEligibility, getEligibilityById, claimEligibility };
