const crypto = require('crypto');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Eligibility = require('../models/Eligibility');
const ApprovalAuditLog = require('../models/ApprovalAuditLog');
const sendEmail = require('../utils/sendEmail');
const { sendAdminNotification } = require('../utils/workflowEmailer');
const { createApprovalAuditLog } = require('../utils/approvalAudit');

const getFrontendBaseUrl = () => String(process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

/**
 * Evaluation Admin approves candidate profile
 * Status: awaiting_evaluation_review -> awaiting_operations_review
 * Sends notification to Operations Admin
 */
const evaluationApprove = async (req, res) => {
  try {
    const { id } = req.params;
    const { reasonNote } = req.body;

    if (!reasonNote) {
      return res.status(400).json({ message: 'Reason note is required' });
    }

    const candidate = await User.findOne({ _id: id, role: 'candidate' });
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    if (candidate.evaluationStatus === 'approved') {
      return res.status(409).json({ message: 'Candidate already approved by Evaluation Admin' });
    }

    const previousStatus = candidate.status;
    candidate.evaluationStatus = 'approved';
    candidate.evaluationApprovedBy = req.user?.email || '';
    candidate.evaluationApprovedAt = new Date();
    candidate.status = 'awaiting_operations_review';
    await candidate.save();

    // Notify Operations Admin
    const operationsAdminEmail = process.env.OPERATIONS_ADMIN_EMAIL || '';
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || '';
    const notificationRecipients = [superAdminEmail, operationsAdminEmail].filter(Boolean);

    if (notificationRecipients.length) {
      await sendAdminNotification({
        to: notificationRecipients,
        subject: `Candidate Awaiting Operational Approval`,
        lines: [
          `Candidate: ${candidate.name || candidate.email}`,
          `Email: ${candidate.email}`,
          `Evaluation Admin: ${req.user?.email || 'N/A'}`,
          `Evaluation Approved At: ${candidate.evaluationApprovedAt.toISOString()}`,
          ``,
          `Action Required: Operations Admin must review and approve/reject this candidate.`,
          `Review Link: ${getFrontendBaseUrl()}/admin/candidates/${String(candidate._id)}`,
        ],
        fromType: 'noreply',
        templateKey: 'operations_approval_required',
      });
    }

    await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'profile_evaluation',
      sectionRecordId: String(candidate._id),
      previousStatus,
      newStatus: 'awaiting_operations_review',
      reasonNote,
      sourcePage: req.body?.sourcePage || '/admin/evaluation',
    });

    res.json({
      message: 'Candidate approved by Evaluation Admin',
      candidate: {
        _id: candidate._id,
        status: candidate.status,
        evaluationStatus: candidate.evaluationStatus,
        operationsStatus: candidate.operationsStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Evaluation Admin rejects candidate profile
 * Status: awaiting_evaluation_review -> evaluation_rejected
 * Sends rejection email to candidate
 */
const evaluationReject = async (req, res) => {
  try {
    const { id } = req.params;
    const { reasonNote } = req.body;

    if (!reasonNote) {
      return res.status(400).json({ message: 'Reason note is required' });
    }

    const candidate = await User.findOne({ _id: id, role: 'candidate' });
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const previousStatus = candidate.status;
    candidate.evaluationStatus = 'rejected';
    candidate.evaluationRejectedBy = req.user?.email || '';
    candidate.evaluationRejectedAt = new Date();
    candidate.status = 'evaluation_rejected';
    await candidate.save();

    // Send rejection email to candidate
    const rejectionText = `Dear ${candidate.name || 'Candidate'},\r\n\r\nThank you for submitting your profile to NextStep Talent.\r\n\r\nAfter careful review, we regret to inform you that your profile does not meet our current requirements for progression to the next stage.\r\n\r\nWe appreciate your interest and wish you success in your career endeavors.\r\n\r\nRegards,  \r\nNextStep Talent Team\r\n\r\nThis is an automated email. Please do not reply to this message.`;

    await sendEmail({
      to: candidate.email,
      subject: 'NextStep Talent – Profile Evaluation Result',
      text: rejectionText,
      html: rejectionText.replaceAll('\n', '<br/>'),
      fromEmail: 'noreply@nextsteptalent.net',
      fromName: 'NextStep Talent Team',
      templateKey: 'evaluation_rejection',
      relatedCandidateId: candidate._id,
    });

    await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'profile_evaluation',
      sectionRecordId: String(candidate._id),
      previousStatus,
      newStatus: 'evaluation_rejected',
      reasonNote,
      sourcePage: req.body?.sourcePage || '/admin/evaluation',
    });

    res.json({
      message: 'Candidate rejected by Evaluation Admin',
      candidate: {
        _id: candidate._id,
        status: candidate.status,
        evaluationStatus: candidate.evaluationStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Operations Admin approves candidate
 * Status: awaiting_operations_review -> operations_approved -> fully_approved
 * Sends account creation invitation email to candidate
 */
const operationsApprove = async (req, res) => {
  try {
    const { id } = req.params;
    const { reasonNote } = req.body;

    if (!reasonNote) {
      return res.status(400).json({ message: 'Reason note is required' });
    }

    const candidate = await User.findOne({ _id: id, role: 'candidate' });
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    if (candidate.evaluationStatus !== 'approved') {
      return res.status(409).json({ message: 'Evaluation Admin must approve first' });
    }

    if (candidate.operationsStatus === 'approved') {
      return res.status(409).json({ message: 'Candidate already approved by Operations Admin' });
    }

    const previousStatus = candidate.status;
    candidate.operationsStatus = 'approved';
    candidate.operationsApprovedBy = req.user?.email || '';
    candidate.operationsApprovedAt = new Date();
    candidate.status = 'fully_approved';
    candidate.accountStatus = 'invited';
    
    // Generate account invitation token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    candidate.accountInviteToken = crypto.createHash('sha256').update(inviteToken).digest('hex');
    candidate.accountInviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    candidate.accountCreationInviteSent = true;
    candidate.accountCreationInviteSentAt = new Date();
    
    await candidate.save();

    // Send account creation invitation email
    const inviteUrl = `${getFrontendBaseUrl()}/create-account?token=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(candidate.email)}`;
    const inviteText = `Dear ${candidate.name || 'Candidate'},\r\n\r\nCongratulations! Your profile has been reviewed and approved by our team.\r\n\r\nYou are now invited to create your candidate account to continue with the onboarding process.\r\n\r\nEmail: ${candidate.email}\r\n\r\nPlease use the link below to create your account:\r\n${inviteUrl}\r\n\r\nThis invitation link will expire in 7 days.\r\n\r\nImportant:\r\n- You must use the email address: ${candidate.email}\r\n- The link is for one-time use only\r\n- After creating your account, you will need to verify your email\r\n\r\nRegards,  \r\nNextStep Talent Team\r\n\r\nThis is an automated email. Please do not reply to this message.`;

    await sendEmail({
      to: candidate.email,
      subject: 'NextStep Talent – Account Creation Invitation',
      text: inviteText,
      html: inviteText.replaceAll('\n', '<br/>'),
      fromEmail: 'noreply@nextsteptalent.net',
      fromName: 'NextStep Talent Team',
      templateKey: 'account_creation_invitation',
      relatedCandidateId: candidate._id,
    });

    await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'operations_approval',
      sectionRecordId: String(candidate._id),
      previousStatus,
      newStatus: 'fully_approved',
      reasonNote,
      sourcePage: req.body?.sourcePage || '/admin/operations',
    });

    res.json({
      message: 'Candidate approved by Operations Admin and invitation sent',
      candidate: {
        _id: candidate._id,
        status: candidate.status,
        evaluationStatus: candidate.evaluationStatus,
        operationsStatus: candidate.operationsStatus,
        accountStatus: candidate.accountStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Operations Admin rejects candidate
 * Status: awaiting_operations_review -> operations_rejected
 * Sends rejection email to candidate
 */
const operationsReject = async (req, res) => {
  try {
    const { id } = req.params;
    const { reasonNote } = req.body;

    if (!reasonNote) {
      return res.status(400).json({ message: 'Reason note is required' });
    }

    const candidate = await User.findOne({ _id: id, role: 'candidate' });
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const previousStatus = candidate.status;
    candidate.operationsStatus = 'rejected';
    candidate.operationsRejectedBy = req.user?.email || '';
    candidate.operationsRejectedAt = new Date();
    candidate.status = 'operations_rejected';
    await candidate.save();

    // Send rejection email to candidate
    const rejectionText = `Dear ${candidate.name || 'Candidate'},\r\n\r\nThank you for your interest in NextStep Talent.\r\n\r\nAfter operational review, we regret to inform you that we are unable to proceed with your application at this time.\r\n\r\nWe appreciate your interest and wish you success in your future endeavors.\r\n\r\nRegards,  \r\nNextStep Talent Team\r\n\r\nThis is an automated email. Please do not reply to this message.`;

    await sendEmail({
      to: candidate.email,
      subject: 'NextStep Talent – Application Status',
      text: rejectionText,
      html: rejectionText.replaceAll('\n', '<br/>'),
      fromEmail: 'noreply@nextsteptalent.net',
      fromName: 'NextStep Talent Team',
      templateKey: 'operations_rejection',
      relatedCandidateId: candidate._id,
    });

    await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'operations_approval',
      sectionRecordId: String(candidate._id),
      previousStatus,
      newStatus: 'operations_rejected',
      reasonNote,
      sourcePage: req.body?.sourcePage || '/admin/operations',
    });

    res.json({
      message: 'Candidate rejected by Operations Admin',
      candidate: {
        _id: candidate._id,
        status: candidate.status,
        operationsStatus: candidate.operationsStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  evaluationApprove,
  evaluationReject,
  operationsApprove,
  operationsReject,
};
