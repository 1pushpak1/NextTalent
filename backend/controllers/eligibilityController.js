const Eligibility = require('../models/Eligibility');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { runEligibilityCheck } = require('../utils/eligibilityRules');

const checkEligibility = async (req, res) => {
  try {
    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').toLowerCase().trim();
    
    if (!fullName) {
      return res.status(400).json({ message: 'Full name is required.' });
    }
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
      await sendStepUpdateEmail({
        to: email,
        candidateName: fullName || email.split('@')[0],
        stepKey: 'eligibility',
        subjectOverride: 'Congratulations! You are eligible to proceed',
        heading: 'Eligibility Approved',
        message: 'You have successfully passed the initial eligibility screening. Please proceed to complete your profile submission.',
        status: 'accepted',
        details: [
          { label: 'Destination', value: payload.destination },
          { label: 'Country', value: payload.country },
          { label: 'Next Step', value: 'Complete your profile submission' },
        ],
        cta: { label: 'Submit Profile', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/profile-submission?eligibilityId=${record._id}` },
      });
    } else {
      await sendStepUpdateEmail({
        to: email,
        candidateName: fullName || email.split('@')[0],
        stepKey: 'eligibility',
        subjectOverride: 'Eligibility Result',
        heading: 'Not Eligible',
        message: result.rejectionReason || 'Your current profile does not meet the eligibility criteria at this time.',
        status: 'rejected',
        details: [
          { label: 'Destination', value: payload.destination },
          { label: 'Country', value: payload.country },
          { label: 'Reason', value: result.rejectionReason || 'Does not meet criteria' },
        ],
        cta: null,
      });
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
