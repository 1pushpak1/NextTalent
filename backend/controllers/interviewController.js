const Interview = require('../models/Interview');
const User = require('../models/User');

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
    res.status(201).json(interview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMyInterviews, addInterview };
