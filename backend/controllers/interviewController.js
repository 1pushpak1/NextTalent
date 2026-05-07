const Interview = require('../models/Interview');
const User = require('../models/User');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');

const getMyInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addInterview = async (req, res) => {
  try {
    const interview = await Interview.create(req.body);
    await User.findByIdAndUpdate(req.body.userId, { status: 'interview_scheduled' });
    const candidate = await User.findById(req.body.userId).lean();
    await sendStepUpdateEmail({
      to: candidate?.email,
      candidateName: candidate?.name || candidate?.email?.split('@')[0],
      stepKey: 'interviews',
      heading: 'Interview scheduled',
      message: 'Your interview has been scheduled. Please review the date, time, and partner details from your candidate dashboard.',
      status: 'under_review',
      details: [
        { label: 'Hiring Partner', value: req.body.hiringPartner || '—' },
        { label: 'Role', value: req.body.role || '—' },
        { label: 'Date', value: req.body.date || '—' },
        { label: 'Time', value: req.body.time || '—' },
      ],
      cta: { label: 'Open Interviews', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/interviews` },
      eventType: 'interview',
    });
    res.status(201).json(interview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMyInterviews, addInterview };
