const crypto = require('crypto');
const mongoose = require('mongoose');
const fs = require('fs');
const User = require('../models/User');
const Eligibility = require('../models/Eligibility');
const Profile = require('../models/Profile');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');
const InterviewSlot = require('../models/InterviewSlot');
const InterviewBooking = require('../models/InterviewBooking');
const { ADMIN_ROLES, PAYMENT_STAGES, EMAIL_TEMPLATE_KEYS, LEGACY_PAYMENT_TYPE_TO_STAGE, PAYMENT_STAGE_CONFIG } = require('../constants/workflow');
const { normalizeAdminRole } = require('../constants/workflow');
const { getPaymentsAdminEmails, getEvaluationAdminEmails, getOperationsAdminEmails } = require('../utils/adminRoleEmails');
const { sendTransactionalEmailSafe } = require('../services/emailService');
const { createAuditLog } = require('../services/auditService');
const {
  generateInvoiceForStage,
  generateReceiptForPayment,
  buildReceiptEmailForPayment,
  buildInvoiceEmailForStage,
} = require('../services/billingPdfService');
const { initiateBackgroundCheck } = require('../services/sterlingService');
const { wrapHtml, applicationStatusUpdate, websiteUrl } = require('../services/emailTemplateService');
const { candidateInterviewEligible } = require('./candidateController');

const FRONTEND_BASE = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
const adminCandidateLink = (candidate) => `${FRONTEND_BASE}/admin/candidates/${candidate?.candidateId || candidate?._id || candidate}`;
const workflowFromEmail = String(process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || 'noreply@nextsteptalent.net').trim();
const workflowFromName = String(process.env.SMTP_FROM_NAME || 'NextStep Talent').trim();

const resolveCandidate = async (candidateId) => {
  const identifier = String(candidateId || '').trim();
  if (!identifier) return null;
  const query = { role: 'candidate' };
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    query.$or = [{ _id: identifier }, { candidateId: identifier }];
  } else {
    query.candidateId = identifier;
  }
  return User.findOne(query);
};

const paymentStageFromInput = (input) => {
  const normalized = String(input || '').trim().toUpperCase();
  if (Object.values(PAYMENT_STAGES).includes(normalized)) return normalized;
  const legacyKey = String(input || '').trim().toLowerCase();
  return LEGACY_PAYMENT_TYPE_TO_STAGE[legacyKey] || null;
};

const ensureRole = (req, role) => normalizeAdminRole(req.user?.adminRole) === normalizeAdminRole(role);

const evaluationApprove = async (req, res) => {
  try {
    const candidate = await resolveCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const previous = {
      evaluationStatus: candidate.evaluationStatus,
      status: candidate.status,
    };

    candidate.evaluationStatus = 'approved';
    candidate.evaluationApprovedBy = req.user.email;
    candidate.evaluationApprovedAt = new Date();
    candidate.status = 'accepted';
    if (!candidate.stageStatuses) candidate.stageStatuses = new Map();
    candidate.stageStatuses.set('evaluation', 'accepted');
    await candidate.save();

    await Profile.findOneAndUpdate(
      { userId: candidate._id },
      { status: 'accepted' },
      { sort: { createdAt: -1 } }
    );

    const operationsAdmins = getOperationsAdminEmails();
    const profile = await Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 });
    const profileSummary = profile
      ? [
          `Education: ${JSON.stringify(profile.education || {})}`,
          `Work Experience Entries: ${Array.isArray(profile.workExperience) ? profile.workExperience.length : 0}`,
          `Certifications Entries: ${Array.isArray(profile.certifications) ? profile.certifications.length : 0}`,
          `Languages Entries: ${Array.isArray(profile.languages) ? profile.languages.length : 0}`,
        ].join('\n')
      : 'Profile summary not available';
    const profileUrl = adminCandidateLink(candidate);
    const resumeUrl = `${FRONTEND_BASE}/api/profile/generated-pdf`;
    await sendTransactionalEmailSafe({
      to: operationsAdmins,
      subject: `NextStep Talent Candidate For Approval / ${candidate.name || candidate.email.split('@')[0]}`,
      text: [
        'Candidate summary',
        `Candidate Name: ${candidate.name || 'N/A'}`,
        `Candidate Email: ${candidate.email}`,
        `Candidate ID: ${candidate.candidateId || String(candidate._id)}`,
        profileSummary,
        `Resume/Profile attachment: ${resumeUrl}`,
        'Review options:',
        '- Approve',
        '- Reject',
        '- Interview Required',
        `Backend Review Link: ${profileUrl}`,
      ].join('\n'),
      html: wrapHtml({
        title: 'Candidate Evaluation Approved',
        bodyHtml: `<p>Admin 2 approved the candidate and Admin 3 review is required.</p><p><b>Candidate Name:</b> ${candidate.name || 'N/A'}<br/><b>Candidate Email:</b> ${candidate.email}<br/><b>Candidate ID:</b> ${candidate.candidateId || String(candidate._id)}<br/><b>Evaluation Approval Timestamp:</b> ${candidate.evaluationApprovedAt.toISOString()}<br/><b>Approved By:</b> ${req.user.name || req.user.email}</p><p><b>Candidate summary</b><br/>${profileSummary.replaceAll('\n', '<br/>')}</p><p><b>Resume/Profile attachment:</b> <a href="${resumeUrl}">${resumeUrl}</a></p><p><b>Review options:</b><br/>Approve<br/>Reject<br/>Interview Required</p><p><b>Backend Review Link:</b> <a href="${profileUrl}">${profileUrl}</a></p>`,
      }),
      templateKey: 'internal_admin3_review_request',
      relatedCandidateId: candidate._id,
    });

    await createAuditLog({
      req,
      actorType: 'admin',
      actorId: req.user.email,
      actorRole: req.user.adminRole,
      candidateId: candidate._id,
      action: 'admin_evaluation_approved',
      previousValue: previous,
      newValue: {
        evaluationStatus: candidate.evaluationStatus,
        status: candidate.status,
        evaluationApprovedBy: candidate.evaluationApprovedBy,
      },
      metadata: {
        reasonNote: String(req.body?.reasonNote || ''),
      },
    });

    return res.json({ message: 'Evaluation approved', candidate });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const evaluationReject = async (req, res) => {
  try {
    const candidate = await resolveCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const previous = {
      evaluationStatus: candidate.evaluationStatus,
      status: candidate.status,
    };

    candidate.evaluationStatus = 'rejected';
    candidate.evaluationApprovedBy = req.user.email;
    candidate.evaluationApprovedAt = new Date();
    candidate.status = 'rejected';
    if (!candidate.stageStatuses) candidate.stageStatuses = new Map();
    candidate.stageStatuses.set('evaluation', 'rejected');
    await candidate.save();

    await Profile.findOneAndUpdate(
      { userId: candidate._id },
      { status: 'rejected' },
      { sort: { createdAt: -1 } }
    );

    const candidateMail = applicationStatusUpdate({ candidateName: candidate.name, selected: false });
    await sendTransactionalEmailSafe({
      to: candidate.email,
      ...candidateMail,
      templateKey: EMAIL_TEMPLATE_KEYS.CANDIDATE_REJECTION,
      relatedCandidateId: candidate._id,
    });

    await createAuditLog({
      req,
      actorType: 'admin',
      actorId: req.user.email,
      actorRole: req.user.adminRole,
      candidateId: candidate._id,
      action: 'admin_evaluation_rejected',
      previousValue: previous,
      newValue: {
        evaluationStatus: candidate.evaluationStatus,
        status: candidate.status,
      },
      metadata: {
        reasonNote: String(req.body?.reasonNote || ''),
      },
    });

    return res.json({ message: 'Evaluation rejected', candidate });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const operationsDecision = async (req, res) => {
  try {
    const candidate = await resolveCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const decision = String(req.body?.decision || '').trim().toLowerCase();
    if (!['interview_required', 'interview_not_required', 'rejected', 'cancelled', 'canceled'].includes(decision)) {
      return res.status(400).json({ message: 'Invalid operations decision' });
    }
    const normalizedDecision = decision === 'canceled' ? 'cancelled' : decision;

    const previous = {
      operationsStatus: candidate.operationsStatus,
      operationsDecision: candidate.operationsDecision,
      status: candidate.status,
    };

    candidate.operationsStatus = ['rejected', 'cancelled'].includes(normalizedDecision) ? 'rejected' : 'approved';
    candidate.operationsDecision = normalizedDecision;
    candidate.operationsApprovedBy = req.user.email;
    candidate.operationsCompletedAt = new Date();

    if (!candidate.stageStatuses) candidate.stageStatuses = new Map();
    candidate.stageStatuses.set('selection', normalizedDecision === 'cancelled' ? 'rejected' : 'under_review');

    if (normalizedDecision === 'cancelled') {
      candidate.status = 'not_selected';
      candidate.selectedStatus = 'not_selected';
    } else if (normalizedDecision === 'rejected') {
      candidate.status = 'operations_rejected';
      candidate.selectedStatus = 'pending';
    } else {
      candidate.status = normalizedDecision === 'interview_required' ? 'interview_required_pending_sterling' : 'operations_approved';
      candidate.selectedStatus = 'pending';
    }

    await candidate.save();

    if (normalizedDecision === 'interview_required') {
      const openSlots = await InterviewSlot.find({ isBooked: false }).sort({ startTime: 1 }).limit(10).lean();
      const berlinFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const slotLines = openSlots.length
        ? openSlots.map((slot) => `- ${berlinFormatter.format(new Date(slot.startTime))} to ${berlinFormatter.format(new Date(slot.endTime))}`)
        : ['- No slots published yet. Please check again shortly.'];
      const interviewRequestText = `Dear Candidate,

Your profile has progressed to the next stage of internal review.

As part of the assessment process, a short 15-minute online interaction has been requested by our evaluation team.

Please select one of the available time slots below to confirm your availability.

[AVAILABLE TIME SLOTS - All timings are displayed in German Time Zone]
${slotLines.join('\n')}

Once your slot is confirmed, you will receive a separate confirmation email with meeting details.

Regards,  
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;
      await sendTransactionalEmailSafe({
        to: candidate.email,
        subject: 'NextStep Talent – Interview Availability Request',
        text: interviewRequestText,
        html: interviewRequestText.replaceAll('\n', '<br/>'),
        fromEmail: 'noreply@nextsteptalent.net',
        fromName: 'NextStep Talent Team',
        templateKey: 'interview_availability_request',
        relatedCandidateId: candidate._id,
      });
    }

    if (normalizedDecision === 'rejected') {
      const rejectionText = `Dear Candidate,

Thank you for your interest in NextStep Talent and for taking the time to complete the initial application process.

Following our internal review and assessment process, we regret to inform you that your profile will not be progressing to the next stage at this time.

Please note that candidate evaluations are based on multiple factors including current opportunity alignment, role-specific requirements, market considerations, profile suitability, and internal assessment criteria.

This decision does not reflect negatively on your professional background or future potential, and we encourage you to continue pursuing opportunities aligned with your qualifications and experience.

We appreciate your interest in NextStep Talent and wish you success in your future professional endeavors.

Regards,  
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;
      await sendTransactionalEmailSafe({
        to: candidate.email,
        subject: 'NextStep Talent – Profile Review Update',
        text: rejectionText,
        html: rejectionText.replaceAll('\n', '<br/>'),
        fromEmail: 'noreply@nextsteptalent.net',
        fromName: 'NextStep Talent Team',
        templateKey: 'admin3_rejection_candidate',
        relatedCandidateId: candidate._id,
      });
    }

    if (normalizedDecision === 'interview_not_required') {
      const evaluationApproved = String(candidate.evaluationStatus || '').toLowerCase() === 'approved' || String(candidate.status || '').toLowerCase() === 'evaluation_approved' || Boolean(candidate.admin2EvaluationApproved);
      if (!evaluationApproved) {
        return res.status(409).json({ message: 'Evaluation approval must be completed before sending the account invitation' });
      }

      candidate.operationsStatus = 'approved';
      candidate.status = 'account_invited';
      candidate.accountStatus = 'invited';

      const inviteToken = crypto.randomBytes(32).toString('hex');
      candidate.accountInviteToken = crypto.createHash('sha256').update(inviteToken).digest('hex');
      candidate.accountInviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      candidate.accountCreationInviteSent = true;
      candidate.accountCreationInviteSentAt = new Date();
      await candidate.save();

      const eligibility = await Eligibility.findOne({ userId: candidate._id }).sort({ createdAt: -1 });
      if (eligibility) {
        eligibility.accountCreationInviteSent = true;
        eligibility.accountCreationInviteSentAt = new Date();
        await eligibility.save();
      }

      const inviteUrl = `${FRONTEND_BASE}/create-account?token=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(candidate.email)}`;
      const inviteText = `Dear ${String(candidate.name || 'Candidate').trim()},

Your application has been approved by both review stages.

You may now create your candidate account using the same email address used for your application.

Next steps:
1. Create your account using the link below.
2. Verify your email address after account creation.
3. Verify your mobile number after email verification.
4. Continue to your candidate dashboard for the next steps.

Email: ${candidate.email}
Create Account Link: ${inviteUrl}

This invitation link expires in 7 days and can be used only once.

Regards,
NextStep Talent Team

This is an official communication from NextStep Talent.`;

      await sendTransactionalEmailSafe({
        to: candidate.email,
        subject: 'NextStep Talent – Account Creation Invitation',
        text: inviteText,
        html: inviteText.replaceAll('\n', '<br/>'),
        fromEmail: workflowFromEmail,
        fromName: workflowFromName,
        templateKey: EMAIL_TEMPLATE_KEYS.PROFILE_ACCOUNT_INVITE,
        relatedCandidateId: candidate._id,
      });
    }

    if (normalizedDecision === 'cancelled') {
      const admin1Recipients = getPaymentsAdminEmails();
      const admin2Recipients = getEvaluationAdminEmails();
      const adminRecipients = [...new Set([...admin1Recipients, ...admin2Recipients])];
      const recipientList = [...new Set([candidate.email, ...adminRecipients])];
      const cancellationLines = [
        'Application has been cancelled by Operations Admin.',
        `Candidate Name: ${candidate.name || 'N/A'}`,
        `Candidate Email: ${candidate.email}`,
        `Candidate ID: ${candidate.candidateId || String(candidate._id)}`,
        `Cancelled By: ${req.user.name || req.user.email}`,
        `Cancelled At: ${candidate.operationsCompletedAt.toISOString()}`,
      ];
      await sendTransactionalEmailSafe({
        to: recipientList,
        subject: `NextStep Talent Application Cancelled / ${candidate.name || candidate.email.split('@')[0]}`,
        text: cancellationLines.join('\n'),
        html: wrapHtml({
          title: 'Application Cancelled',
          bodyHtml: `<p>Application has been cancelled by Operations Admin.</p><p><b>Candidate:</b> ${candidate.name || 'N/A'}<br/><b>Email:</b> ${candidate.email}<br/><b>Candidate ID:</b> ${candidate.candidateId || String(candidate._id)}<br/><b>Cancelled By:</b> ${req.user.name || req.user.email}<br/><b>Cancelled At:</b> ${candidate.operationsCompletedAt.toISOString()}</p>`,
        }),
        templateKey: EMAIL_TEMPLATE_KEYS.CANDIDATE_NOT_SELECTED,
        relatedCandidateId: candidate._id,
      });
    }

    const interviewBooking = await InterviewBooking.findOne({ candidateId: candidate._id }).sort({ createdAt: -1 }).lean();
    const interviewConducted = interviewBooking ? 'Yes' : 'No';
    const reviewerNotes = String(req.body?.reasonNote || req.body?.notes || '').trim() || 'N/A';
    const admin3Outcome = ['rejected', 'cancelled'].includes(normalizedDecision) ? 'Rejected' : 'Approved';
    const recipients = [...new Set([...getPaymentsAdminEmails(), ...getEvaluationAdminEmails()])];
    await sendTransactionalEmailSafe({
      to: recipients,
      subject: `Admin 3 Review Completed / ${candidate.name || candidate.email.split('@')[0]}`,
      text: [
        `Approved / Rejected: ${admin3Outcome}`,
        `Interview Conducted: ${interviewConducted}`,
        `Reviewer Notes: ${reviewerNotes}`,
        `Timestamp: ${candidate.operationsCompletedAt.toISOString()}`,
        `Candidate Name: ${candidate.name || 'N/A'}`,
        `Candidate ID: ${candidate.candidateId || String(candidate._id)}`,
        `Backend Review Link: ${adminCandidateLink(candidate)}`,
      ].join('\n'),
      html: wrapHtml({
        title: 'Admin 3 Review Completed',
        bodyHtml: `<p><b>Approved / Rejected:</b> ${admin3Outcome}<br/><b>Interview Conducted:</b> ${interviewConducted}<br/><b>Reviewer Notes:</b> ${reviewerNotes}<br/><b>Timestamp:</b> ${candidate.operationsCompletedAt.toISOString()}<br/><b>Candidate Name:</b> ${candidate.name || 'N/A'}<br/><b>Candidate ID:</b> ${candidate.candidateId || String(candidate._id)}<br/><b>Backend Review Link:</b> <a href="${adminCandidateLink(candidate)}">${adminCandidateLink(candidate)}</a></p>`,
      }),
      templateKey: 'internal_admin3_review_completed',
      relatedCandidateId: candidate._id,
    });

    await createAuditLog({
      req,
      actorType: 'admin',
      actorId: req.user.email,
      actorRole: req.user.adminRole,
      candidateId: candidate._id,
      action: 'admin_operations_decision',
      previousValue: previous,
      newValue: {
        operationsStatus: candidate.operationsStatus,
        operationsDecision: candidate.operationsDecision,
        status: candidate.status,
      },
      metadata: {
        reasonNote: String(req.body?.reasonNote || ''),
      },
    });

    return res.json({ message: 'Operations decision applied', candidate });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const initiateSterlingForCandidate = async (req, res) => {
  try {
    const candidate = await resolveCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const previous = {
      backgroundCheckStatus: candidate.backgroundCheckStatus,
      backgroundCheckReferenceId: candidate.backgroundCheckReferenceId,
    };

    const result = await initiateBackgroundCheck(candidate._id, { requestedBy: req.user.email });

    const updatedCandidate = await User.findById(candidate._id);

    await createAuditLog({
      req,
      actorType: 'admin',
      actorId: req.user.email,
      actorRole: req.user.adminRole,
      candidateId: candidate._id,
      action: 'sterling_initiated',
      previousValue: previous,
      newValue: {
        backgroundCheckStatus: updatedCandidate.backgroundCheckStatus,
        backgroundCheckReferenceId: updatedCandidate.backgroundCheckReferenceId,
      },
      metadata: result,
    });

    if (updatedCandidate.backgroundCheckStatus === 'completed' && candidateInterviewEligible(updatedCandidate)) {
      await sendTransactionalEmailSafe({
        to: updatedCandidate.email,
        subject: 'NextStep Talent Interview Scheduling Invitation',
        text: [
          'Background verification is completed.',
          'You can now book your 15-minute interview slot.',
          `Booking Link: ${FRONTEND_BASE}/interviews`,
          'Contact: contact@NextStepTalent.net',
        ].join('\n'),
        html: wrapHtml({
          title: 'Interview Scheduling Invitation',
          bodyHtml: `<p>Background verification is completed.</p><p>You can now book your 15-minute interview slot.</p><p><a href="${FRONTEND_BASE}/interviews">Open Interview Booking</a></p>`,
        }),
        templateKey: EMAIL_TEMPLATE_KEYS.INTERVIEW_INVITATION,
        relatedCandidateId: updatedCandidate._id,
      });
    }

    return res.json({ message: 'Sterling background check initiated', result, candidate: updatedCandidate });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const selectedCandidate = async (req, res) => {
  try {
    const candidate = await resolveCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const previous = {
      selectedStatus: candidate.selectedStatus,
      status: candidate.status,
    };

    candidate.selectedStatus = 'selected';
    candidate.selectedBy = req.user.email;
    candidate.selectedAt = new Date();
    candidate.status = 'selected';
    await candidate.save();

    const mail = applicationStatusUpdate({
      candidateName: candidate.name,
      selected: true,
      withPayment: false,
    });

    await sendTransactionalEmailSafe({
      to: candidate.email,
      ...mail,
      templateKey: EMAIL_TEMPLATE_KEYS.CANDIDATE_SELECTED_PAYMENT,
      relatedCandidateId: candidate._id,
    });

    const selectionText = `Dear ${candidate.name || 'Candidate'},

Your profile has been selected for the next stage of the NextStep Talent process.

You will receive the final payment request separately after the team completes the remaining operational steps.

Regards,
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;

    await sendTransactionalEmailSafe({
      to: candidate.email,
      subject: 'NextStep Talent – Selection Result',
      text: selectionText,
      html: selectionText.replaceAll('\n', '<br/>'),
      fromEmail: 'noreply@nextsteptalent.net',
      fromName: 'NextStep Talent Team',
      templateKey: 'selection_result_selected',
      relatedCandidateId: candidate._id,
    });

    await createAuditLog({
      req,
      actorType: 'admin',
      actorId: req.user.email,
      actorRole: req.user.adminRole,
      candidateId: candidate._id,
      action: 'candidate_selected_result_published',
      previousValue: previous,
      newValue: {
        selectedStatus: candidate.selectedStatus,
        status: candidate.status,
      },
      metadata: {},
    });

    return res.json({ message: 'Candidate selection published', candidate });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const notSelectedCandidate = async (req, res) => {
  try {
    const candidate = await resolveCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const previous = {
      selectedStatus: candidate.selectedStatus,
      status: candidate.status,
    };

    candidate.selectedStatus = 'not_selected';
    candidate.selectedBy = req.user.email;
    candidate.selectedAt = new Date();
    candidate.status = 'rejected';
    await candidate.save();

    const mail = applicationStatusUpdate({ candidateName: candidate.name, selected: false });
    await sendTransactionalEmailSafe({
      to: candidate.email,
      ...mail,
      templateKey: EMAIL_TEMPLATE_KEYS.CANDIDATE_NOT_SELECTED,
      relatedCandidateId: candidate._id,
    });

    await createAuditLog({
      req,
      actorType: 'admin',
      actorId: req.user.email,
      actorRole: req.user.adminRole,
      candidateId: candidate._id,
      action: 'candidate_selection_rejected_notified',
      previousValue: previous,
      newValue: {
        selectedStatus: candidate.selectedStatus,
        status: candidate.status,
      },
      metadata: {
        reasonNote: String(req.body?.reasonNote || ''),
      },
    });

    return res.json({ message: 'Candidate marked not selected and notified', candidate });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const generateInvoiceForCandidate = async (req, res) => {
  try {
    const candidate = await resolveCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const paymentStage = paymentStageFromInput(req.body?.paymentStage || req.body?.stage);
    if (!paymentStage || ![PAYMENT_STAGES.FIRST_INSTALLMENT, PAYMENT_STAGES.FINAL_PAYMENT].includes(paymentStage)) {
      return res.status(400).json({ message: 'paymentStage must be FIRST_INSTALLMENT or FINAL_PAYMENT' });
    }

    const existing = await Invoice.findOne({ candidateId: candidate._id, paymentStage }).sort({ createdAt: -1 });
    if (existing) return res.json({ message: 'Invoice already exists', invoice: existing });

    const amountReceived = paymentStage === PAYMENT_STAGES.FINAL_PAYMENT ? Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0) : 0;
    const invoice = await generateInvoiceForStage({ candidate, stage: paymentStage, amountReceived });
    candidate.invoices = [...new Set([...(candidate.invoices || []).map(String), String(invoice._id)])];
    await candidate.save();

    const invoiceMail = await buildInvoiceEmailForStage({
      candidate,
      invoice,
      stage: paymentStage,
      amountReceived,
    });
    const invoiceAttachments = invoice?.pdfPath && fs.existsSync(invoice.pdfPath)
      ? [{ filename: `${invoice.invoiceNumber}.pdf`, path: invoice.pdfPath, contentType: 'application/pdf' }]
      : [];

    await sendTransactionalEmailSafe({
      to: candidate.email,
      ...invoiceMail,
      templateKey:
        paymentStage === PAYMENT_STAGES.FIRST_INSTALLMENT
          ? EMAIL_TEMPLATE_KEYS.INVOICE_STAGE_1
          : EMAIL_TEMPLATE_KEYS.INVOICE_STAGE_2,
      attachments: invoiceAttachments,
      relatedCandidateId: candidate._id,
    });

    if (paymentStage === PAYMENT_STAGES.FIRST_INSTALLMENT) {
      const firstAmount = Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FIRST_INSTALLMENT].amount || 0);
      const text = `Invoice available in portal\nAmount due: USD $${firstAmount.toLocaleString('en-US')}\nPayment details mentioned on invoice \nTimeline of payment within 30 days of invoice date \nProcessing continues after payment confirmation\n\nRegards,  \nNextStep Talent Team\n\nThis is an automated email. Please do not reply to this message.`;
      await sendTransactionalEmailSafe({
        to: candidate.email,
        subject: 'NextStep Talent – Invoice Generated & Payment Request',
        text,
        html: text.replaceAll('\n', '<br/>'),
        fromEmail: 'noreply@nextsteptalent.net',
        fromName: 'NextStep Talent Team',
        templateKey: 'invoice_generated_payment_request_stage1',
        relatedCandidateId: candidate._id,
      });
    }

    if (paymentStage === PAYMENT_STAGES.FINAL_PAYMENT) {
      const finalAmount = Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0);
      const text = `Dear Candidate,\n\nWe are pleased to inform you that your profile has successfully progressed through the evaluation and employer coordination stages, and your application has been approved to proceed to the final onboarding phase.\n\nAs part of the final onboarding process, the remaining balance payment is now due.\n\nFinal Payment Amount: USD $${finalAmount.toLocaleString('en-US')}\n\nYour invoice has been generated and is available within your candidate portal for review and download.\n\nPlease complete the payment within the specified timeline to avoid delays in onboarding progression and employer-side processing.\n\nUpon successful receipt of payment, our team will continue with the final coordination, onboarding formalities, and process completion steps.\n\nIf any additional documentation or actions are required from your end, the operations team will contact you separately.\n\nWe appreciate your cooperation throughout the process and look forward to supporting you through the final onboarding stage.\n\nRegards,  \nNextStep Talent Team\n\nThis is an automated email. Please do not reply to this message.`;
      await sendTransactionalEmailSafe({
        to: candidate.email,
        subject: 'NextStep Talent – Final Payment Request',
        text,
        html: text.replaceAll('\n', '<br/>'),
        fromEmail: 'noreply@nextsteptalent.net',
        fromName: 'NextStep Talent Team',
        templateKey: 'final_payment_request',
        relatedCandidateId: candidate._id,
      });
    }

    await createAuditLog({
      req,
      actorType: 'admin',
      actorId: req.user.email,
      actorRole: req.user.adminRole,
      candidateId: candidate._id,
      action: 'invoice_generated',
      previousValue: null,
      newValue: {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        paymentStage,
      },
      metadata: {},
    });

    return res.status(201).json({ message: 'Invoice generated', invoice });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const verifyCandidatePayment = async (req, res) => {
  try {
    const candidate = await resolveCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const { paymentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(paymentId)) return res.status(400).json({ message: 'Invalid payment id' });

    const payment = await Payment.findOne({ _id: paymentId, userId: candidate._id });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (['verified', 'completed', 'paid'].includes(String(payment.status || '').toLowerCase()) && payment.receiptId) {
      return res.status(409).json({ message: 'Payment is already verified and receipt already generated' });
    }

    const previous = {
      status: payment.status,
      receiptId: payment.receiptId,
      verifiedAt: payment.verifiedAt,
    };

    const normalizedStatus = String(req.body?.status || 'verified').toLowerCase();
    const status = normalizedStatus === 'rejected' ? 'rejected' : 'verified';
    payment.status = status;
    payment.verifiedBy = req.user.email;
    payment.verifiedAt = new Date();

    if (String(req.body?.bankTransactionReference || '').trim()) {
      payment.bankTransactionReference = String(req.body.bankTransactionReference).trim();
      payment.bankReference = String(req.body.bankTransactionReference).trim();
    }

    let invoice = payment.invoiceId ? await Invoice.findById(payment.invoiceId) : null;
    const stage = payment.stage || LEGACY_PAYMENT_TYPE_TO_STAGE[payment.type];

    if (stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE) {
      payment.nonRefundableAmount = 500;
      payment.refundableAmount = 0;
      payment.refundStatus = 'non_refundable';
    }
    if (stage === PAYMENT_STAGES.FIRST_INSTALLMENT) {
      if (candidate.selectedStatus === 'not_selected') {
        payment.nonRefundableAmount = 200;
        payment.refundableAmount = 2900;
        payment.refundStatus = 'partially_refundable';
      } else if (candidate.selectedStatus === 'selected') {
        payment.nonRefundableAmount = Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FIRST_INSTALLMENT].amount || 0);
        payment.refundableAmount = 0;
        payment.refundStatus = 'non_refundable';
      } else {
        payment.nonRefundableAmount = 200;
        payment.refundableAmount = 2900;
        payment.refundStatus = 'conditional';
      }
    }

    if (!invoice && status === 'verified' && [PAYMENT_STAGES.FIRST_INSTALLMENT, PAYMENT_STAGES.FINAL_PAYMENT].includes(stage)) {
      invoice = await Invoice.findOne({ candidateId: candidate._id, paymentStage: stage }).sort({ createdAt: -1 });
      if (!invoice) {
        invoice = await generateInvoiceForStage({
          candidate,
          stage,
          amountReceived: stage === PAYMENT_STAGES.FINAL_PAYMENT ? Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0) : 0,
        });
      }
      payment.invoiceId = invoice._id;
      candidate.invoices = [...new Set([...(candidate.invoices || []).map(String), String(invoice._id)])];
    }

    let receipt = null;
    if (status === 'verified') {
      receipt = payment.receiptId ? await Receipt.findById(payment.receiptId) : null;
      if (!receipt) {
        receipt = await Receipt.findOne({ paymentId: payment._id }).sort({ createdAt: -1 });
      }
      if (!receipt) {
        receipt = await generateReceiptForPayment({ candidate, payment, stage });
      }
      payment.receiptId = receipt._id;
      payment.receiptUrl = receipt.pdfUrl;
      candidate.receipts = [...new Set([...(candidate.receipts || []).map(String), String(receipt._id)])];

      if (stage === PAYMENT_STAGES.FINAL_PAYMENT) {
        candidate.status = 'final_payment_complete';
      }
    }

    await payment.save();
    await candidate.save();

    if (receipt) {
      const attachments = [];
      if (receipt.pdfPath && fs.existsSync(receipt.pdfPath)) {
        attachments.push({
          filename: `${receipt.receiptNumber}.pdf`,
          path: receipt.pdfPath,
          contentType: 'application/pdf',
        });
      }
      if (invoice?.pdfPath && fs.existsSync(invoice.pdfPath)) {
        attachments.push({
          filename: `${invoice.invoiceNumber}.pdf`,
          path: invoice.pdfPath,
          contentType: 'application/pdf',
        });
      }

      const receiptMail = await buildReceiptEmailForPayment({
        candidate,
        payment,
        receipt,
        stage,
        invoice,
      });

      await sendTransactionalEmailSafe({
        to: candidate.email,
        ...receiptMail,
        templateKey:
          stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE
            ? EMAIL_TEMPLATE_KEYS.RECEIPT_INITIAL
            : stage === PAYMENT_STAGES.FIRST_INSTALLMENT
              ? EMAIL_TEMPLATE_KEYS.RECEIPT_FIRST
              : EMAIL_TEMPLATE_KEYS.RECEIPT_FINAL,
        attachments,
        relatedCandidateId: candidate._id,
      });
    }

    if (status === 'verified' && stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE) {
      const text = `Dear Candidate,

We confirm that your initial onboarding payment has been successfully received.

Your profile has now progressed to the documentation and onboarding stage.

The next steps of the process will include:
- Documentation upload
- Agreement acknowledgments
- Internal onboarding review
- Profile processing

You will receive further instructions shortly regarding document submission requirements.

Regards,  
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;
      await sendTransactionalEmailSafe({
        to: candidate.email,
        subject: 'NextStep Talent – Payment Successfully Received',
        text,
        html: text.replaceAll('\n', '<br/>'),
        fromEmail: 'noreply@nextsteptalent.net',
        fromName: 'NextStep Talent Team',
        templateKey: 'payment_500_received',
        relatedCandidateId: candidate._id,
      });
    }

    if (status === 'verified' && stage === PAYMENT_STAGES.FIRST_INSTALLMENT) {
      const text = `Dear Candidate,

We confirm receipt of your payment toward the next stage of the onboarding and career development process.

Your profile has now progressed to the mandatory verification stage.

As part of this process, login to the portal & initiate the external professional verification for:
- Education
- Employment history
- Background screening
- Supporting credentials

Please note:
Verification completion is mandatory before progression to employer interview stages.

Regards,  
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;
      await sendTransactionalEmailSafe({
        to: candidate.email,
        subject: 'NextStep Talent – Payment Confirmation & Verification Process',
        text,
        html: text.replaceAll('\n', '<br/>'),
        fromEmail: 'noreply@nextsteptalent.net',
        fromName: 'NextStep Talent Team',
        templateKey: 'payment_first_installment_received',
        relatedCandidateId: candidate._id,
      });
    }

    if (status === 'verified' && stage === PAYMENT_STAGES.FIRST_INSTALLMENT) {
      const evaluationAdmins = getEvaluationAdminEmails();
      const candidateName = candidate?.name || candidate?.email?.split('@')[0] || 'Candidate';
      await sendTransactionalEmailSafe({
        to: evaluationAdmins,
        subject: `NextStep Talent Document Verification Pending / ${candidateName}`,
        text: [
          'Program fee payment receipt has been approved and document verification is now pending.',
          `Candidate: ${candidateName}`,
          `Candidate Email: ${candidate?.email || 'N/A'}`,
          `Candidate ID: ${candidate?.candidateId || String(candidate?._id || '')}`,
          `Payment Type: Program Fee (First Installment)`,
          `Approved By: ${req.user?.name || req.user?.email || 'Admin 1'}`,
          `Approved At: ${new Date().toISOString()}`,
          `Review Link: ${adminCandidateLink(candidate)}?tab=documents&review=document-verification`,
          'Next Action: Review candidate documents and approve/reject verification from admin panel.',
        ].join('\n'),
        html: wrapHtml({
          title: 'Document Verification Pending',
          bodyHtml: `<p>Program fee payment receipt has been approved and document verification is now pending.</p>
<p><b>Candidate:</b> ${candidateName}<br/>
<b>Candidate Email:</b> ${candidate?.email || 'N/A'}<br/>
<b>Candidate ID:</b> ${candidate?.candidateId || String(candidate?._id || '')}<br/>
<b>Payment Type:</b> Program Fee (First Installment)<br/>
<b>Approved By:</b> ${req.user?.name || req.user?.email || 'Admin 1'}<br/>
<b>Approved At:</b> ${new Date().toISOString()}<br/>
<b>Review Link:</b> <a href="${adminCandidateLink(candidate)}?tab=documents&review=document-verification">${adminCandidateLink(candidate)}?tab=documents&review=document-verification</a></p>
<p>Next Action: Review candidate documents and approve/reject verification from admin panel.</p>`,
        }),
        templateKey: 'document_verification_pending_admin2',
        relatedCandidateId: candidate._id,
      });
    }

    if (status === 'verified' && stage === PAYMENT_STAGES.FINAL_PAYMENT) {
      const text = `Dear Candidate,

We confirm that your final payment has been successfully received.

Your onboarding process is now progressing to the final coordination and completion stage.

Our team will continue with the necessary employer coordination, onboarding formalities, and related operational processes as applicable to your profile and opportunity alignment.

Should any additional documentation, instructions, or process-related actions be required from your end, you will receive further communication from the operations team.

We appreciate your cooperation and professionalism throughout the process and wish you success in the next stage of your professional journey.

Regards,  
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;
      await sendTransactionalEmailSafe({
        to: candidate.email,
        subject: 'NextStep Talent – Final Payment Confirmation',
        text,
        html: text.replaceAll('\n', '<br/>'),
        fromEmail: 'noreply@nextsteptalent.net',
        fromName: 'NextStep Talent Team',
        templateKey: 'final_payment_received',
        relatedCandidateId: candidate._id,
      });
    }

    await createAuditLog({
      req,
      actorType: 'admin',
      actorId: req.user.email,
      actorRole: req.user.adminRole,
      candidateId: candidate._id,
      action: 'payment_verified',
      previousValue: previous,
      newValue: {
        status: payment.status,
        verifiedBy: payment.verifiedBy,
        verifiedAt: payment.verifiedAt,
        invoiceId: payment.invoiceId,
        receiptId: payment.receiptId,
      },
      metadata: {
        paymentId: payment._id,
        stage,
        transactionId: payment.transactionId,
      },
    });

    return res.json({
      message: 'Payment verification updated',
      payment,
      invoice,
      receipt,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createInterviewSlot = async (req, res) => {
  try {
    const startTime = new Date(req.body?.startTime);
    const timezone = String(req.body?.timezone || 'UTC');

    if (Number.isNaN(startTime.getTime())) {
      return res.status(400).json({ message: 'Valid startTime is required' });
    }

    const endTime = req.body?.endTime ? new Date(req.body.endTime) : new Date(startTime.getTime() + 15 * 60 * 1000);
    if (Number.isNaN(endTime.getTime()) || endTime <= startTime) {
      return res.status(400).json({ message: 'endTime must be after startTime' });
    }

    const slot = await InterviewSlot.create({
      adminId: req.user.email,
      adminRole: normalizeAdminRole(req.user.adminRole) || ADMIN_ROLES.OPERATIONS_ADMIN,
      startTime,
      endTime,
      timezone,
      isBooked: false,
    });

    await createAuditLog({
      req,
      actorType: 'admin',
      actorId: req.user.email,
      actorRole: req.user.adminRole,
      candidateId: null,
      action: 'interview_slot_created',
      previousValue: null,
      newValue: {
        slotId: slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone,
      },
      metadata: {
        scope: 'global',
      },
    }).catch(() => null);

    return res.status(201).json({ slot });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listInterviewBookings = async (req, res) => {
  try {
    const bookings = await InterviewBooking.find({ adminId: req.user.email })
      .populate('candidateId', 'name email candidateId backgroundCheckStatus')
      .populate('slotId')
      .sort({ startTime: -1 })
      .lean();

    return res.json({ bookings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const sendNotSelectedEmailFromAdmin = async (req, res) => {
  return notSelectedCandidate(req, res);
};

const sendTestEmail = async (req, res) => {
  try {
    const to = String(req.body?.to || req.user.email || '').trim();
    if (!to) return res.status(400).json({ message: 'Recipient email is required' });

    const result = await sendTransactionalEmailSafe({
      to,
      subject: 'NextStep Talent SMTP Test Email',
      text: 'SMTP configuration test successful.',
      html: wrapHtml({ title: 'SMTP Test Email', bodyHtml: '<p>SMTP configuration test successful.</p>' }),
      templateKey: 'smtp_test',
    });

    if (!result.ok) {
      return res.status(500).json({ message: result.error?.message || 'Test email failed', emailLogId: result.error?.emailLogId || null });
    }

    return res.json({ message: 'Test email sent successfully', emailLogId: result.log?._id || null });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  evaluationApprove,
  evaluationReject,
  operationsDecision,
  initiateSterlingForCandidate,
  selectedCandidate,
  notSelectedCandidate,
  sendNotSelectedEmailFromAdmin,
  generateInvoiceForCandidate,
  verifyCandidatePayment,
  createInterviewSlot,
  listInterviewBookings,
  sendTestEmail,
};
