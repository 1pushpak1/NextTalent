const Eligibility = require('../models/Eligibility');

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

  if (!baseChecks) {
    return { isEligible: false, rejectionReason: 'General eligibility criteria not met.' };
  }

  if (country === 'Germany') {
    const isEligible = languageAnswer === 'Yes';
    return {
      isEligible,
      rejectionReason: isEligible ? '' : 'German B2 certification requirement not met.',
    };
  }

  if (country === 'Switzerland') {
    const languageOk = languageAnswer !== 'No';
    const locationOk = currentLocation === 'Europe';
    const isEligible = languageOk && locationOk;
    return {
      isEligible,
      rejectionReason: isEligible ? '' : 'Location or language requirement not met for Switzerland.',
    };
  }

  if (country === 'Austria') {
    const languageOk = languageAnswer === 'Yes';
    const locationOk = currentLocation === 'Europe';
    const isEligible = languageOk && locationOk;
    return {
      isEligible,
      rejectionReason: isEligible ? '' : 'Location or German B2 requirement not met for Austria.',
    };
  }

  if (country === 'Poland') {
    const languageOk = languageAnswer === 'Yes';
    const locationOk = currentLocation === 'Europe';
    const isEligible = languageOk && locationOk;
    return {
      isEligible,
      rejectionReason: isEligible ? '' : 'Location or professional English requirement not met for Poland.',
    };
  }

  return { isEligible: false, rejectionReason: 'Unsupported country.' };
};

const checkEligibility = async (req, res) => {
  try {
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
