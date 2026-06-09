const User = require('../models/User');
const Profile = require('../models/Profile');
const Eligibility = require('../models/Eligibility');
const ApprovalAuditLog = require('../models/ApprovalAuditLog');
const sendEmail = require('../utils/sendEmail');
const { sendAdminNotification } = require('../utils/workflowEmailer');
const { getOperationsAdminEmails } = require('../utils/adminRoleEmails');
const { createApprovalAuditLog } = require('../utils/approvalAudit');
const {
  createActivationForCandidate,
} = require('../utils/accountActivation');

const getFrontendBaseUrl = () => String(process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

/**
 * Evaluation Admin approves candidate profile
 * Status: awaiting_evaluation_review -> evaluation_approved
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
    const profile = await Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 });
    candidate.evaluationStatus = 'approved';
    candidate.evaluationApprovedBy = req.user?.email || '';
    candidate.evaluationApprovedAt = new Date();
    candidate.admin2EvaluationApproved = true;
    candidate.admin2EvaluationApprovedAt = new Date();
    candidate.admin2EvaluationApprovedBy = req.user?.email || '';
    candidate.status = 'evaluation_approved';
    candidate.operationsStatus = 'pending';
    candidate.accountStatus = 'not_invited';
    candidate.accountInviteToken = '';
    candidate.accountInviteExpiresAt = null;
    candidate.accountCreationInviteSent = false;
    candidate.accountCreationInviteSentAt = null;
    if (profile) profile.status = 'accepted';
    await candidate.save();
    if (profile) await profile.save();

    // Notify Operations Admins
    const notificationRecipients = getOperationsAdminEmails();
    if (!notificationRecipients.length) {
      const operationsAdminEmail = process.env.OPERATIONS_ADMIN_EMAIL || '';
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || '';
      notificationRecipients.push(superAdminEmail, operationsAdminEmail);
    }

    if (notificationRecipients.length) {
      const reviewUrl = `${getFrontendBaseUrl()}/admin/candidates/${candidate.candidateId || String(candidate._id)}`;
      const notificationResult = await sendAdminNotification({
        to: notificationRecipients,
        subject: "Candidate Awaiting Arna's Approval",
        lines: [
          `Candidate Name: ${candidate.name || 'N/A'}`,
          `Candidate ID: ${candidate.candidateId || String(candidate._id)}`,
          `Email: ${candidate.email}`,
          `Evaluation Admin: ${req.user?.email || 'N/A'}`,
          `Evaluation Approved At: ${candidate.evaluationApprovedAt.toISOString()}`,
          ``,
          `Action Required: Operations Admin must review and approve/reject this candidate.`,
          `Review Link: ${reviewUrl}`,
        ],
        html: `
          <p>Candidate: ${candidate.name || candidate.email}</p>
          <p>Candidate ID: ${candidate.candidateId || String(candidate._id)}</p>
          <p>Email: ${candidate.email}</p>
          <p>Evaluation Admin: ${req.user?.email || 'N/A'}</p>
          <p>Evaluation Approved At: ${candidate.evaluationApprovedAt.toISOString()}</p>
          <p>Action Required: Operations Admin must review and approve/reject this candidate.</p>
          <p><a href="${reviewUrl}" style="display:inline-block;background:#002147;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Open Candidate Review</a></p>
          <p>If the button does not open, use this link: <a href="${reviewUrl}">${reviewUrl}</a></p>
        `,
        fromType: 'noreply',
        templateKey: 'operations_approval_required',
      });
      console.info('[approval] operations review notification queued', {
        candidateId: String(candidate._id),
        candidateEmail: candidate.email,
        recipientCount: notificationRecipients.length,
        recipients: notificationRecipients,
        sendResult: notificationResult,
      });
    }

    await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'profile_evaluation',
      sectionRecordId: String(candidate._id),
      previousStatus,
      newStatus: 'evaluation_approved',
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
 * Status: evaluation_approved -> operations_approved -> fully_approved -> account_invited
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

    const evaluationApproved = candidate.evaluationStatus === 'approved';
    const evaluationStatusOk = ['evaluation_approved', 'accepted'].includes(String(candidate.status || '').toLowerCase());
    if (!evaluationApproved || !evaluationStatusOk) {
      return res.status(409).json({ message: 'Evaluation approval must be completed first' });
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
    candidate.admin1ProgressionApproved = true;
    candidate.admin1ProgressionApprovedAt = new Date();
    candidate.admin1ProgressionApprovedBy = req.user?.email || '';
    
    candidate.accountCreationInviteSent = true;
    candidate.accountCreationInviteSentAt = new Date();
    
    await candidate.save();

    const { token: inviteToken } = await createActivationForCandidate({
      email: candidate.email,
      candidateName: candidate.name || '',
      issuedBy: req.user?.email || '',
      issuedForCandidateId: String(candidate._id),
      issuedForUserId: candidate._id,
    });

    // Send account creation invitation email
    const inviteUrl = `${getFrontendBaseUrl()}/create-account?token=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(candidate.email)}`;
    const inviteText = `Dear ${candidate.name || 'Candidate'},\r\n\r\nProfile approved\r\nYour profile has been approved. Please complete the next steps from your dashboard.\r\n\r\nStatus: Approved\r\nProfile Status: accepted\r\nNext Step: Complete the next dashboard step\r\n\r\nYou may now create your candidate account using the link below.\r\n\r\nCreate Account Link: ${inviteUrl}\r\nEmail: ${candidate.email}\r\n\r\nThis invitation link will expire in 7 days and can be used only once. After creating your account, you can continue directly to your dashboard.\r\n\r\nRegards,  \r\nNextStep Talent Team\r\n\r\nThis is an automated email. Please do not reply to this message.`;

    await sendEmail({
      to: candidate.email,
      subject: 'NextStep Talent – Profile approved and account creation link',
      text: inviteText,
      html: inviteText.replaceAll('\n', '<br/>'),
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@nextsteptalent.net',
      fromName: process.env.SMTP_FROM_NAME || process.env.FROM_NAME || 'NextStep Talent Team',
      templateKey: 'account_creation_invitation',
      relatedCandidateId: candidate._id,
    });

    candidate.status = 'account_invited';
    await candidate.save();

    await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'final_selection',
      sectionRecordId: String(candidate._id),
      previousStatus,
      newStatus: 'account_invited',
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
      approvalType: 'final_selection',
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
