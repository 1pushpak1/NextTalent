const Interview = require('../models/Interview');
const User = require('../models/User');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { getWorkflowConfig, sendAdminNotification } = require('../utils/workflowEmailer');

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
    const candidate = await User.findById(req.body.userId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    const sterlingDecision = String(candidate?.stageStatuses?.get?.('background-verification') || candidate?.stageStatuses?.['background-verification'] || '').toLowerCase();
    if (sterlingDecision !== 'accepted') {
      return res.status(403).json({ message: 'Interview cannot be scheduled until Sterling verification is initiated and completed.' });
    }

    const interviewPayload = {
      ...req.body,
      durationMinutes: 15,
    };
    const interview = await Interview.create(interviewPayload);
    await User.findByIdAndUpdate(req.body.userId, { status: 'interview_scheduled' });
    const workflow = getWorkflowConfig();

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
        { label: 'Duration', value: '15 minutes' },
      ],
      cta: { label: 'Open Interviews', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/interviews` },
      eventType: 'interview',
    });
    await sendAdminNotification({
      to: workflow.admin3,
      subject: `NextStep Talent Interview Booked / ${candidate?.name || candidate?.email?.split('@')[0] || 'Candidate'}`,
      lines: [
        'A candidate interview has been booked.',
        `Candidate: ${candidate?.name || candidate?.email?.split('@')[0] || 'N/A'}`,
        `Email: ${candidate?.email || 'N/A'}`,
        `Date: ${req.body.date || 'N/A'}`,
        `Time: ${req.body.time || 'N/A'}`,
        'Duration: 15 minutes',
      ],
      fromType: 'noreply',
    });
    res.status(201).json(interview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMyInterviews, addInterview };
