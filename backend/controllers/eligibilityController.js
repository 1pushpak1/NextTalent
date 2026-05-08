const Eligibility = require('../models/Eligibility');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');

const acceptedQualifications = [
  'Diploma with one year practical training',
  'Bachelor’s',
  'Master’s',
  "Bachelor's",
];

const runEligibilityCheck = ({
  destination,
  country,
  hasITBackground,
  qualification,
  languageAnswer,
  currentLocation,
  willingToRelocate,
  comfortableWithFees,
}) => {
  if (!destination) {
    return { isEligible: false, rejectionReason: 'Destination is required.' };
  }
  if (!country) {
    return { isEligible: false, rejectionReason: 'Country is required.' };
  }
  if (destination !== 'Europe Active') {
    return { isEligible: false, rejectionReason: 'Selected destination is not open yet.' };
  }

  const baseChecks =
    hasITBackground === true &&
    acceptedQualifications.includes(qualification) &&
    willingToRelocate === true &&
    comfortableWithFees === true;

  if (country === 'Germany') {
    const qualificationOk = acceptedQualifications.includes(qualification);
    const languageOk = languageAnswer === 'Yes';
    const isEligible = hasITBackground === true && qualificationOk && languageOk;
    return {
      isEligible,
      rejectionReason: isEligible
        ? ''
        : 'Germany requires an IT background, an accepted qualification, and certified German B2 or above.',
    };
  }

  if (country === 'Poland') {
    const languageOk = languageAnswer === 'Yes';
    const locationOk = currentLocation === 'Europe';
    const isEligible = hasITBackground === true && languageOk && locationOk;
    return {
      isEligible,
      rejectionReason: isEligible ? '' : 'Poland requires an IT background, Europe location, and professional English proficiency.',
    };
  }

  if (!baseChecks) {
    return { isEligible: false, rejectionReason: 'General eligibility criteria not met.' };
  }

  if (country === 'Switzerland') {
    const languageOk = languageAnswer !== 'No';
    const locationOk = currentLocation === 'Europe';
    const isEligible = hasITBackground === true && languageOk && locationOk;
    return {
      isEligible,
      rejectionReason: isEligible ? '' : 'Switzerland requires an IT background, Europe location, and certified B2 or above in German, French, or Italian.',
    };
  }

  if (country === 'Austria') {
    const languageOk = languageAnswer === 'Yes';
    const locationOk = currentLocation === 'Europe';
    const isEligible = hasITBackground === true && languageOk && locationOk;
    return {
      isEligible,
      rejectionReason: isEligible ? '' : 'Austria requires an IT background, Europe location, and certified German B2 or above.',
    };
  }

  return { isEligible: false, rejectionReason: 'Unsupported country.' };
};

const checkEligibility = async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
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
      willingToRelocate: Boolean(req.body?.willingToRelocate),
      comfortableWithFees: Boolean(req.body?.comfortableWithFees),
    };
    const result = runEligibilityCheck(payload);

    const record = await Eligibility.create({
      userId: req.user?._id || null,
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
    });

    await sendStepUpdateEmail({
      to: email,
      candidateName: email.split('@')[0],
      stepKey: 'eligibility',
      subjectOverride: result.isEligible ? 'Congratulations! Your initial eligibility has been approved.' : '',
      heading: result.isEligible ? 'Congratulations! Your initial eligibility has been approved.' : 'Eligibility result: not eligible right now',
      message: result.isEligible
        ? 'Great news. You have successfully passed the initial eligibility screening. You can now continue with account creation using this same email, then complete verification, submit your profile, and follow the next dashboard milestones through evaluation, documents, payments, and final result updates.'
        : 'Your current profile does not meet the active criteria at this time. You can try again later if your profile changes.',
      status: result.isEligible ? 'accepted' : 'rejected',
      details: [
        { label: 'Destination', value: payload.destination },
        { label: 'Country', value: payload.country },
        { label: 'Reason', value: result.rejectionReason || 'Passed all active checks' },
        ...(result.isEligible
          ? [
              { label: 'What Happens Next', value: 'Create account, verify details, submit profile, and track progress in dashboard' },
              { label: 'Important', value: 'Use the same email for signup to continue your pathway without interruption' },
            ]
          : []),
      ],
      cta: result.isEligible ? { label: 'Continue to Signup', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/signup?next=/profile-submission` } : null,
    });

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
