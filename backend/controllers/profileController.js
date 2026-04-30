const Profile = require('../models/Profile');
const User = require('../models/User');
const Eligibility = require('../models/Eligibility');
const generatePdf = require('../utils/generatePdf');
const sendEmail = require('../utils/sendEmail');

const createProfile = async (req, res) => {
  try {
    const body = req.body;
    const userId = req.user?._id;

    const eligibility = await Eligibility.findOne({ userId, isEligible: true }).sort({ createdAt: -1 });
    if (!eligibility) {
      return res.status(403).json({ message: 'Complete and pass eligibility check before profile submission' });
    }

    if (!body.financialDisclosureAccepted) {
      return res.status(400).json({ message: 'Financial disclosure must be accepted' });
    }
    if (!body.acknowledgementSigned || !body.signature?.value) {
      return res.status(400).json({ message: 'Acknowledgement signature is required' });
    }

    const profile = await Profile.create({
      userId,
      personalDetails: body.personalDetails,
      education: body.education,
      certifications: body.certifications || [],
      workExperience: body.workExperience || [],
      skills: body.skills || {},
      languages: body.languages || [],
      additionalInfo: body.additionalInfo || '',
      financialDisclosureAccepted: body.financialDisclosureAccepted,
      acknowledgementSigned: body.acknowledgementSigned,
      signature: body.signature,
      status: 'submitted',
    });

    const pdfUrl = await generatePdf(profile);
    profile.generatedPdfUrl = pdfUrl;
    await profile.save();

    await User.findByIdAndUpdate(userId, { status: 'profile_submitted' });

    if (body.personalDetails?.email) {
      await sendEmail({
        to: body.personalDetails.email,
        subject: 'Profile Submitted - NextStep Talent',
        text: 'Your profile has been submitted and is now in internal evaluation.',
      });
    }

    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(profile || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    Object.assign(profile, req.body);
    await profile.save();

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generateProfilePdf = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const pdfUrl = await generatePdf(profile);
    profile.generatedPdfUrl = pdfUrl;
    await profile.save();

    res.json({ pdfUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProfile, getMyProfile, updateMyProfile, generateProfilePdf };
