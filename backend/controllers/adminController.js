const fs = require('fs');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Document = require('../models/Document');
const Interview = require('../models/Interview');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');
const Eligibility = require('../models/Eligibility');
const Testimonial = require('../models/Testimonial');
const ApprovalAuditLog = require('../models/ApprovalAuditLog');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { deriveCandidateProgress } = require('../utils/candidateProgress');
const {
  sanitizeReasonNote,
  createApprovalAuditLog,
  filterAuditEntriesForAdmin,
} = require('../utils/approvalAudit');
const { getProgramFeeBreakdown } = require('../utils/programFee');
const { LEGACY_PAYMENT_TYPE_TO_STAGE, PAYMENT_STAGES, EMAIL_TEMPLATE_KEYS, PAYMENT_STAGE_CONFIG } = require('../constants/workflow');
const sendEmail = require('../utils/sendEmail');
const { getWorkflowConfig, sendAdminNotification, normalizeEmail } = require('../utils/workflowEmailer');
const { getPaymentsAdminEmails, getEvaluationAdminEmails, getOperationsAdminEmails } = require('../utils/adminRoleEmails');
const {
  generateInvoiceForStage,
  generateReceiptForPayment,
  buildReceiptEmailForPayment,
  buildInvoiceEmailForStage,
} = require('../services/billingPdfService');

const validProfileStatuses = ['submitted', 'under_review', 'accepted', 'rejected'];
const validDocumentStatuses = ['Pending', 'Uploaded', 'Under Review', 'Accepted', 'Needs Revision'];
const validPaymentTypes = ['initial', 'program', 'final'];
const validPaymentStatuses = ['completed', 'pending', 'failed', 'refunded'];
const validStageDecisionStatuses = ['accepted', 'rejected', 'under_review'];
const validStageKeys = [
  'evaluation',
  'declaration',
  'documents',
  'background-verification',
  'document-verification',
  'hiring',
  'selection',
  'testimonials',
];

const stageLabelMap = {
  account_created: 'Account Created',
  profile_submitted: 'Profile Submitted',
  accepted: 'Internal Evaluation',
  rejected: 'Internal Evaluation',
  declaration_signed: 'Declaration & Contract',
  onboarding_complete: 'Declaration & Contract',
  documents_submitted: 'Document Uploads',
  documents_received: 'Document Verification',
  sent_to_partners: 'Hiring Partner Stage',
  interview_completed: 'Selection Results',
  selected: 'Selection Results',
  not_selected: 'Selection Results',
  process_complete: 'Testimonials',
};

const stagePageLabelMap = {
  evaluation: 'Internal Evaluation',
  declaration: 'Declaration & Contract',
  documents: 'Document Uploads',
  'background-verification': 'Background Verification',
  'document-verification': 'Document Verification',
  hiring: 'Hiring Partner Stage',
  selection: 'Selection Results',
  testimonials: 'Testimonials',
};

const normalizeDocumentAdminComment = (value = '') => String(value || '').trim().slice(0, 1000);

const getFrontendBaseUrl = () => String(process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
const isAdmin1Role = (role = '') => ['payment_admin', 'payments_admin', 'super_admin'].includes(String(role || '').trim().toLowerCase());
const PAYMENT_REQUEST_STAGE_BY_TYPE = {
  program: LEGACY_PAYMENT_TYPE_TO_STAGE.program,
  final: LEGACY_PAYMENT_TYPE_TO_STAGE.final,
};
const PAYMENT_REQUEST_AMOUNT_BY_TYPE = {
  program: Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FIRST_INSTALLMENT].amount || 0),
  final: Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0),
};

const getReceiptTemplateKeyForStage = (stage) => {
  if (stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE) return EMAIL_TEMPLATE_KEYS.RECEIPT_INITIAL;
  if (stage === PAYMENT_STAGES.FIRST_INSTALLMENT) return EMAIL_TEMPLATE_KEYS.RECEIPT_FIRST;
  return EMAIL_TEMPLATE_KEYS.RECEIPT_FINAL;
};

const getInvoiceTemplateKeyForStage = (stage) =>
  stage === PAYMENT_STAGES.FIRST_INSTALLMENT ? EMAIL_TEMPLATE_KEYS.INVOICE_STAGE_1 : EMAIL_TEMPLATE_KEYS.INVOICE_STAGE_2;

const buildPdfAttachment = (document, numberField) => {
  if (!document?.pdfPath || !fs.existsSync(document.pdfPath)) return null;
  return {
    filename: `${document[numberField] || document._id}.pdf`,
    path: document.pdfPath,
    contentType: 'application/pdf',
  };
};

const getPaymentStage = (payment) => payment.stage || LEGACY_PAYMENT_TYPE_TO_STAGE[payment.type];

const ensureInvoiceForPaymentStage = async ({ candidate, stage, amountReceived = 0 }) => {
  if (![PAYMENT_STAGES.FIRST_INSTALLMENT, PAYMENT_STAGES.FINAL_PAYMENT].includes(stage)) return null;

  let invoice = await Invoice.findOne({ candidateId: candidate._id, paymentStage: stage }).sort({ createdAt: -1 });
  if (!invoice) {
    invoice = await generateInvoiceForStage({ candidate, stage, amountReceived });
  }
  await User.findByIdAndUpdate(candidate._id, { $addToSet: { invoices: invoice._id } });
  return invoice;
};

const ensureReceiptForCompletedPayment = async ({ candidate, payment, stage }) => {
  let receipt = payment.receiptId ? await Receipt.findById(payment.receiptId) : null;
  if (!receipt) {
    receipt = await Receipt.findOne({ paymentId: payment._id }).sort({ createdAt: -1 });
  }
  if (!receipt) {
    receipt = await generateReceiptForPayment({ candidate, payment, stage });
    payment.receiptId = receipt._id;
  }

  payment.receiptId = receipt._id;
  payment.receiptUrl = receipt.pdfUrl;
  await payment.save();
  await User.findByIdAndUpdate(candidate._id, { $addToSet: { receipts: receipt._id } });
  return receipt;
};

const sendPaymentReceiptDocumentEmail = async ({ candidate, payment, receipt, stage, invoice = null }) => {
  const mail = await buildReceiptEmailForPayment({ candidate, payment, receipt, stage, invoice });
  const attachments = [
    buildPdfAttachment(receipt, 'receiptNumber'),
    invoice ? buildPdfAttachment(invoice, 'invoiceNumber') : null,
  ].filter(Boolean);

  return sendEmail({
    to: candidate.email,
    ...mail,
    attachments,
    templateKey: getReceiptTemplateKeyForStage(stage),
    relatedCandidateId: candidate._id,
  });
};

const sendInvoiceDocumentEmail = async ({ candidate, invoice, stage, amountReceived = 0 }) => {
  const mail = await buildInvoiceEmailForStage({ candidate, invoice, stage, amountReceived });
  const attachment = buildPdfAttachment(invoice, 'invoiceNumber');
  return sendEmail({
    to: candidate.email,
    ...mail,
    attachments: attachment ? [attachment] : [],
    templateKey: getInvoiceTemplateKeyForStage(stage),
    relatedCandidateId: candidate._id,
  });
};

const getBankTransferInstructionDetails = () => ({
  accountName: String(process.env.BANK_ACCOUNT_NAME || 'NextStep Talent Global LLC'),
  accountNumber: String(process.env.BANK_ACCOUNT_NUMBER || '123456789012'),
  bankName: String(process.env.BANK_NAME || 'Global Trust Bank'),
  branch: String(process.env.BANK_BRANCH || 'Berlin Main Branch'),
  swift: String(process.env.BANK_SWIFT || 'GTBKDEFFXXX'),
  iban: String(process.env.BANK_IBAN || 'DE89370400440532013000'),
  supportEmail: String(process.env.PAYMENT_SUPPORT_EMAIL || process.env.SUPPORT_EMAIL || 'contact@nextsteptalent.net'),
});

const sendInitialAssessmentApprovedEmail = async (candidate) => {
  const candidateName = String(candidate?.name || '').trim() || 'Candidate';
  const initialAmount = Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.INITIAL_ONBOARDING_FEE].amount || 0);
  const text = `Dear ${candidateName},

We are pleased to inform you that your profile has been approved to proceed to the next stage of the NextStep Talent process.

As the next step, you may now complete the initial onboarding payment of USD ${initialAmount} through your candidate portal. This payment confirms your continuation into the onboarding workflow and allows your process to move forward to the subsequent stages.

Important Payment Note:
The USD ${initialAmount} onboarding payment is strictly non-refundable under any circumstances.

Please complete this payment at the earliest so your application timeline is not delayed.

If you need any clarification or support, you may reply to this email or contact us at contact@nextsteptalent.net.

Regards,
NextStep Talent Team

This is an official communication from NextStep Talent.`;
  await sendEmail({
    to: candidate.email,
    subject: 'NextStep Talent – Initial Assessment Approved',
    text,
    html: text.replaceAll('\n', '<br/>'),
    fromEmail: 'noreply@nextsteptalent.net',
    fromName: 'NextStep Talent Team',
    templateKey: 'initial_assessment_approved',
    relatedCandidateId: candidate._id,
  });
};

const initiateDocumentationStage = async (req, res) => {
  try {
    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    if (!candidate.admin1ProgressionApproved) {
      return res.status(409).json({ message: 'Progression must be approved by Admin 1 before documentation stage initiation.' });
    }

    const alreadyInitiated = Boolean(candidate.documentationStageInitiated);
    if (!alreadyInitiated) {
      candidate.documentationStageInitiated = true;
      candidate.documentationStageInitiatedAt = new Date();
      candidate.documentationStageInitiatedBy = String(req.user?.email || '');
      await candidate.save();

      const text = `Dear Candidate,

As part of the onboarding and evaluation process, you are required to upload the requested supporting documentation through your candidate portal.

Required documents may include:
- Passport copy
- Educational qualifications
- Employment documents
- Certifications
- Resume/CV
- Language certifications (if applicable)
- Supporting identification records

Please ensure:
- All documents are accurate and valid
- Uploaded files are clear and readable
- No altered or misleading documents are submitted

Your onboarding process will proceed only after successful submission and review of the required documentation.

Regards,  
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;

      await sendEmail({
        to: candidate.email,
        subject: 'NextStep Talent – Documentation Upload Required',
        text,
        html: text.replaceAll('\n', '<br/>'),
        fromEmail: 'noreply@nextsteptalent.net',
        fromName: 'NextStep Talent Team',
        templateKey: 'documentation_upload_required',
        relatedCandidateId: candidate._id,
      });
    }

    return res.json({
      message: alreadyInitiated ? 'Documentation stage is already initiated' : 'Documentation stage initiated',
      documentationStageInitiated: Boolean(candidate.documentationStageInitiated),
      documentationStageInitiatedAt: candidate.documentationStageInitiatedAt,
      documentationStageInitiatedBy: candidate.documentationStageInitiatedBy || '',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const initiateCandidatePaymentInstruction = async (req, res) => {
  try {
    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const type = String(req.body?.type || '').trim().toLowerCase();
    if (!['program', 'final'].includes(type)) {
      return res.status(400).json({ message: 'Invalid payment type. Use program or final.' });
    }
    if (!candidate.admin1ProgressionApproved) {
      return res.status(409).json({ message: 'Progression must be approved by Admin 1 before sending payment instructions.' });
    }

    const [profile, payments, documents] = await Promise.all([
      Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate._id }).sort({ uploadedAt: -1 }).lean(),
    ]);

    const hasInitialCompleted = payments.some((payment) => payment.type === 'initial' && isPaymentConfirmed(payment));
    const hasProgramCompleted = payments.some((payment) => payment.type === 'program' && isPaymentConfirmed(payment));
    const hasFinalCompleted = payments.some((payment) => payment.type === 'final' && isPaymentConfirmed(payment));
    const hasDocumentsUploaded = documents.length > 0;

    if (type === 'program') {
      if (!hasInitialCompleted) return res.status(409).json({ message: 'Initial payment must be completed first.' });
      if (!hasDocumentsUploaded) return res.status(409).json({ message: 'Documents must be uploaded before sending program fee instructions.' });
      if (hasProgramCompleted) return res.status(409).json({ message: 'Program payment is already completed.' });
    }

    if (type === 'final') {
      if (!hasProgramCompleted) return res.status(409).json({ message: 'Program payment must be completed before sending final payment instructions.' });
      if (String(candidate.status || '').toLowerCase() !== 'selected') {
        return res.status(409).json({ message: 'Final payment instructions can be sent only after candidate is selected.' });
      }
      if (hasFinalCompleted) return res.status(409).json({ message: 'Final payment is already completed.' });
    }

    const amount = type === 'program' ? getProgramFeeBreakdown(profile).total : PAYMENT_REQUEST_AMOUNT_BY_TYPE[type];
    const details = getBankTransferInstructionDetails();
    const paymentLabel = type === 'program' ? 'Program Fee Payment' : 'Final Payment';

    const existingPending = await Payment.findOne({
      userId: candidate._id,
      type,
      status: { $in: ['pending', 'failed'] },
    }).sort({ createdAt: -1 });

    const pendingPayment = existingPending || await Payment.create({
      userId: candidate._id,
      candidateId: candidate._id,
      type,
      stage: PAYMENT_REQUEST_STAGE_BY_TYPE[type],
      amount,
      currency: 'USD',
      method: 'bank_transfer',
      status: 'pending',
      transactionId: `REQ-${type.toUpperCase()}-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    });

    if (existingPending) {
      existingPending.amount = amount;
      existingPending.currency = 'USD';
      existingPending.method = 'bank_transfer';
      existingPending.status = 'pending';
      await existingPending.save();
    }

    const invoice = await ensureInvoiceForPaymentStage({
      candidate,
      stage: PAYMENT_REQUEST_STAGE_BY_TYPE[type],
      amountReceived: type === 'final' ? Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0) : 0,
    });
    if (invoice && String(pendingPayment.invoiceId || '') !== String(invoice._id)) {
      pendingPayment.invoiceId = invoice._id;
      await pendingPayment.save();
    }

    const text = `Dear ${String(candidate.name || 'Candidate').trim()},

This is to inform you that your ${paymentLabel} is now due.

Amount to pay: USD ${amount}
${invoice ? `\nInvoice Number: ${invoice.invoiceNumber}` : ''}

Please complete the transfer using the bank details below:
- Account Name: ${details.accountName}
- Account Number: ${details.accountNumber}
- Bank Name: ${details.bankName}
- Branch: ${details.branch}
- SWIFT: ${details.swift}
- IBAN: ${details.iban}

After completing the transfer, send your payment receipt by replying to this email.
Do not upload the receipt on the portal for this step.

If you need help, contact: ${details.supportEmail}

Regards,
NextStep Talent Team

This is an official communication from NextStep Talent.`;

    const emailResult = await sendEmail({
      to: candidate.email,
      subject: `NextStep Talent – ${paymentLabel} Instructions`,
      text,
      html: text.replaceAll('\n', '<br/>'),
      templateKey: type === 'program' ? 'program_fee_instruction_sent' : 'final_payment_instruction_sent',
      relatedCandidateId: candidate._id,
    });

    if (emailResult?.warning) {
      throw new Error(`Payment instruction email was not delivered: ${emailResult.warning}`);
    }

    if (invoice) {
      await sendInvoiceDocumentEmail({
        candidate,
        invoice,
        stage: PAYMENT_REQUEST_STAGE_BY_TYPE[type],
        amountReceived: type === 'final' ? Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0) : 0,
      });
    }

    return res.status(201).json({
      message: `${paymentLabel} instruction email sent`,
      payment: pendingPayment,
      amount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const toId = (value) => String(value || '');
const allowedSensitiveStageKeys = ['evaluation', 'document-verification', 'selection'];

const ensureReviewPayload = (req, res) => {
  const reasonNote = sanitizeReasonNote(req.body?.reasonNote);
  const reviewConfirmed = req.body?.reviewConfirmed === true;
  const evidenceViewed = req.body?.evidenceViewed === true;

  if (!reasonNote) {
    res.status(400).json({ message: 'A decision reason or note is required.' });
    return null;
  }
  if (!reviewConfirmed) {
    res.status(400).json({ message: 'You must confirm that you reviewed the submission before deciding.' });
    return null;
  }
  if (!evidenceViewed) {
    res.status(400).json({ message: 'Open and review the submitted evidence before approving or rejecting.' });
    return null;
  }

  return {
    reasonNote,
    sourcePage: String(req.body?.sourcePage || '').trim(),
  };
};

const loadApprovalHistory = async (candidateId, req) => {
  const logs = await ApprovalAuditLog.find({ candidateId }).sort({ createdAt: -1 }).lean();
  return filterAuditEntriesForAdmin(logs, req);
};

const buildProgressSummary = ({ candidate, profile, eligibility, documents, interviews, payments, testimonial }) =>
  deriveCandidateProgress({ candidate, profile, eligibility, documents, interviews, payments, testimonial });

const groupLatestByUserId = (records, userKey = 'userId') => {
  const map = new Map();
  for (const item of records) {
    const key = toId(item[userKey]);
    if (!key || map.has(key)) continue;
    map.set(key, item);
  }
  return map;
};

const groupAllByUserId = (records, userKey = 'userId') => {
  const map = new Map();
  for (const item of records) {
    const key = toId(item[userKey]);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
};

const readStageDecision = (candidate, stageKey) => {
  const source = candidate?.stageStatuses;
  if (!source || !stageKey) return 'pending';
  const rawValue =
    typeof source.get === 'function'
      ? source.get(stageKey)
      : source[stageKey];
  return String(rawValue || 'pending').toLowerCase();
};

const isPaymentConfirmed = (payment) =>
  ['completed', 'verified', 'paid'].includes(String(payment?.status || '').toLowerCase());

const buildCandidateSnapshot = ({ candidate, profile, eligibility, documents, interviews, payments }) => {
  const hasSubmittedProfile = Boolean(profile) && profile.status !== 'draft';
  const paymentByType = {
    initial: payments.find((p) => p.type === 'initial' && isPaymentConfirmed(p)),
    program:
      payments.find((p) => p.type === 'program' && isPaymentConfirmed(p)) ||
      (candidate.status === 'program_payment_complete' ? { type: 'program', status: 'completed' } : null),
    final: payments.find((p) => p.type === 'final' && isPaymentConfirmed(p)),
  };

  const hasInitial = Boolean(paymentByType.initial);
  const hasProgram = Boolean(paymentByType.program);
  const hasFinal = Boolean(paymentByType.final);
  const docsUploaded = documents.length > 0;
  const docsUnderReview = documents.some((d) => d.status === 'Under Review');
  const docsVerified = documents.length > 0 && documents.every((d) => d.status === 'Accepted');
  const docsNeedRevision = documents.some((d) => d.status === 'Needs Revision');

  const declarationDone =
    candidate.status === 'declaration_signed' ||
    candidate.status === 'onboarding_complete' ||
    candidate.status === 'documents_submitted' ||
    candidate.status === 'documents_received' ||
    hasProgram ||
    hasFinal ||
    candidate.status === 'selected' ||
    candidate.status === 'process_complete';

  const eligibilityDone = Boolean(eligibility?.isEligible) || Boolean(profile) || hasInitial || docsUploaded;

  const currentStage =
    stageLabelMap[candidate.status] ||
    (hasSubmittedProfile
      ? profile.status === 'submitted' || profile.status === 'under_review'
        ? 'Internal Evaluation'
        : profile.status === 'accepted'
          ? 'Initial Payment'
          : profile.status === 'rejected'
            ? 'Internal Evaluation'
            : 'Profile Submitted'
      : 'Eligibility Applications');

  return {
    candidate,
    profile,
    eligibility,
    documents,
    interviews,
    payments,
    hasInitial,
    hasProgram,
    hasFinal,
    docsUploaded,
    docsUnderReview,
    docsVerified,
    docsNeedRevision,
    declarationDone,
    eligibilityDone,
    currentStage,
  };
};

const deriveAdminStageKey = (snapshot) => {
  const { candidate, profile, hasInitial, hasProgram, hasFinal, docsUploaded } = snapshot;
  const status = String(candidate?.status || '');
  const evaluationDecision = readStageDecision(candidate, 'evaluation');
  const declarationDecision = readStageDecision(candidate, 'declaration');
  const documentVerificationDecision = readStageDecision(candidate, 'document-verification');
  const hiringDecision = readStageDecision(candidate, 'hiring');
  const selectionDecision = readStageDecision(candidate, 'selection');

  if (status === 'process_complete') return 'testimonials';
  if (status === 'selected' && hasFinal) return 'testimonials';
  if (['accepted', 'rejected'].includes(selectionDecision)) return 'selection';
  if (['not_selected', 'rejected'].includes(status)) return 'selection';
  if (status === 'selected') return 'selection';
  if (status === 'interview_completed') return 'selection';
  if (status === 'sent_to_partners' || hiringDecision === 'accepted') return 'selection';
  if (!profile || profile.status === 'draft') return 'evaluation';

  // Admin 2 approved but Admin 3 hasn't yet — still in evaluation queue
  if (!hasInitial) return 'evaluation';
  if (evaluationDecision !== 'accepted') return 'evaluation';

  if (hasInitial && !docsUploaded) {
    const declarationCompletedByCandidate = ['declaration_signed', 'onboarding_complete', 'documents_submitted'].includes(status);
    if (!declarationCompletedByCandidate || declarationDecision !== 'accepted') {
      return 'declaration';
    }
    return 'documents';
  }

  if (docsUploaded && !hasProgram) return null;
  const documentVerificationAccepted =
    documentVerificationDecision === 'accepted' ||
    status === 'documents_received' ||
    snapshot.docsVerified === true;
  if (hasProgram && !documentVerificationAccepted) return 'document-verification';
  if (docsUploaded && hasProgram && documentVerificationAccepted && hiringDecision !== 'accepted') return 'hiring';

  return null;
};

const stageMatcher = (stageKey, snapshot) => {
  const derivedStage = deriveAdminStageKey(snapshot);

  switch (stageKey) {
    case 'dashboard':
      return true;
    case 'evaluation':
      return derivedStage === 'evaluation';
    case 'declaration':
      return derivedStage === 'declaration';
    case 'documents':
      return derivedStage === 'documents';
    case 'document-verification':
      return derivedStage === 'document-verification';
    case 'hiring':
      return derivedStage === 'hiring';
    case 'interviews':
      return false;
    case 'selection':
      return derivedStage === 'selection';
    case 'testimonials':
      return derivedStage === 'testimonials';
    default:
      return true;
  }
};

const passedStageMatcher = (stageKey, snapshot) => {
  if (!stageKey || stageKey === 'dashboard') return false;
  return readStageDecision(snapshot.candidate, stageKey) === 'accepted';
};

const formatCandidateRow = (snapshot, stageKey = '') => {
  const { candidate, profile, currentStage, interviews, testimonial } = snapshot;
  const normalizedStageKey = String(stageKey || '').toLowerCase();
  const stepStatus =
    normalizedStageKey && candidate?.stageStatuses
      ? candidate.stageStatuses[normalizedStageKey] || 'pending'
      : 'pending';
  const latestInterview = interviews[0] || null;
  const displayName = profile?.personalDetails?.firstName || candidate.name || candidate.email?.split('@')?.[0] || 'N/A';
  return {
    _id: candidate._id,
    name: displayName,
    email: candidate.email,
    country: profile?.personalDetails?.currentCountryOfResidence || 'N/A',
    currentStage: stagePageLabelMap[normalizedStageKey] || currentStage,
    status: candidate.status || 'N/A',
    date: candidate.createdAt,
    profileStatus: profile?.status || 'not_submitted',
    stepStatus,
    admin2EvaluationApproved: Boolean(candidate.admin2EvaluationApproved),
    admin3EvaluationApproved: Boolean(candidate.admin3EvaluationApproved),
    assignedHiringPartner: candidate.assignedHiringPartner || '',
    latestInterviewStatus: latestInterview?.status || '',
    latestInterviewRole: latestInterview?.role || '',
    testimonialText: testimonial?.text || '',
  };
};

const fetchAllSnapshots = async () => {
  const candidates = await User.find({ role: 'candidate' }).sort({ createdAt: -1 }).lean();
  const candidateIds = candidates.map((c) => c._id);

  const [profiles, eligibilities, documents, interviews, payments, testimonials] = await Promise.all([
    Profile.find({ userId: { $in: candidateIds } }).sort({ createdAt: -1 }).lean(),
    Eligibility.find({ userId: { $in: candidateIds } }).sort({ createdAt: -1 }).lean(),
    Document.find({ userId: { $in: candidateIds } }).sort({ createdAt: -1 }).lean(),
    Interview.find({ userId: { $in: candidateIds } }).sort({ createdAt: -1 }).lean(),
    Payment.find({ userId: { $in: candidateIds } }).sort({ createdAt: -1 }).lean(),
    Testimonial.find({ userId: { $in: candidateIds } }).sort({ createdAt: -1 }).lean(),
  ]);

  const profileByUser = groupLatestByUserId(profiles);
  const eligibilityByUser = groupLatestByUserId(eligibilities);
  const documentsByUser = groupAllByUserId(documents);
  const interviewsByUser = groupAllByUserId(interviews);
  const paymentsByUser = groupAllByUserId(payments);
  const testimonialByUser = groupLatestByUserId(testimonials);

  return candidates.map((candidate) => {
    const userId = toId(candidate._id);
    const snapshot = buildCandidateSnapshot({
      candidate,
      profile: profileByUser.get(userId) || null,
      eligibility: eligibilityByUser.get(userId) || null,
      documents: documentsByUser.get(userId) || [],
      interviews: interviewsByUser.get(userId) || [],
      payments: paymentsByUser.get(userId) || [],
    });
    snapshot.testimonial = testimonialByUser.get(userId) || null;
    return snapshot;
  });
};

const formatDateSafe = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
};

const toHumanLabel = (value) =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'N/A';

const mapCandidateListRow = (snapshot) => {
  const progress = deriveCandidateProgress({
    candidate: snapshot.candidate,
    profile: snapshot.profile,
    eligibility: snapshot.eligibility,
    documents: snapshot.documents,
    interviews: snapshot.interviews,
    payments: snapshot.payments,
    testimonial: snapshot.testimonial,
  });

  const displayName =
    snapshot.profile?.personalDetails?.firstName ||
    snapshot.candidate?.name ||
    snapshot.candidate?.email?.split('@')?.[0] ||
    'N/A';

  return {
    _id: snapshot.candidate._id,
    name: displayName,
    email: snapshot.candidate.email || '',
    phone: snapshot.candidate.phone || '',
    currentStage: progress.currentStage,
    currentStageKey: progress.currentStageKey,
    profileStatus: progress.profileStatus,
    evaluationStatus: progress.evaluationStatus,
    paymentStatus: progress.paymentStatus,
    documentStatus: progress.documentStatus,
    interviewStatus: progress.interviewStatus,
    selectionStatus: progress.selectionStatus,
    nextPendingAction: progress.nextAction,
    pendingFrom: progress.pendingFrom,
    pendingFromLabel: progress.pendingFrom === 'admin' ? 'Admin' : progress.pendingFrom === 'candidate' ? 'Candidate' : 'Completed',
    recommendedAdminAction: progress.recommendedAdminAction,
    lastUpdatedAt: formatDateSafe(snapshot.candidate.updatedAt),
    createdAt: formatDateSafe(snapshot.candidate.createdAt),
    paymentSummaryLabel: toHumanLabel(
      progress.paymentStatus.final === 'verified'
        ? 'verified'
        : progress.paymentStatus.program === 'pending_verification' || progress.paymentStatus.initial === 'pending_verification'
          ? 'pending_verification'
          : progress.paymentStatus.program === 'verified' || progress.paymentStatus.initial === 'verified'
            ? 'partially_verified'
            : 'not_started'
    ),
    documentStatusLabel: toHumanLabel(progress.documentStatus),
    interviewSelectionStatusLabel: toHumanLabel(progress.selectionStatus),
  };
};

const listCandidatesByStage = async (req, res) => {
  try {
    const stageKey = String(req.params.stageKey || 'dashboard').toLowerCase();
    const filter = String(req.query.filter || 'current').toLowerCase();
    const snapshots = await fetchAllSnapshots();

    const filteredSnapshots =
      filter === 'passed'
        ? snapshots.filter((snapshot) => passedStageMatcher(stageKey, snapshot))
        : snapshots.filter((snapshot) => stageMatcher(stageKey, snapshot));

    const rows = filteredSnapshots.map((snapshot) => formatCandidateRow(snapshot, stageKey));

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const listAllCandidates = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  try {
    const skip = (page - 1) * limit;
    const sortBy = String(req.query.sortBy || 'updatedAt').toLowerCase() === 'createdat' ? 'createdAt' : 'updatedAt';
    const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    const q = String(req.query.q || '').trim().toLowerCase();

    const snapshots = await fetchAllSnapshots();
    const rows = snapshots.map(mapCandidateListRow).sort((a, b) => {
      const aValue = new Date(a[sortBy] || 0).getTime();
      const bValue = new Date(b[sortBy] || 0).getTime();
      return sortOrder * (aValue - bValue);
    });

    const filtered = rows.filter((row) => {
      if (q && !(`${row.name} ${row.email} ${row.phone}`.toLowerCase().includes(q))) return false;
      if (req.query.stage && row.currentStageKey !== String(req.query.stage).trim()) return false;
      if (req.query.profileStatus && row.profileStatus !== String(req.query.profileStatus).trim()) return false;
      if (req.query.evaluationStatus && row.evaluationStatus !== String(req.query.evaluationStatus).trim()) return false;
      if (req.query.paymentStatus && row.paymentSummaryLabel.toLowerCase().replaceAll(' ', '_') !== String(req.query.paymentStatus).trim()) return false;
      if (req.query.documentStatus && row.documentStatus !== String(req.query.documentStatus).trim()) return false;
      if (req.query.interviewStatus && row.interviewStatus !== String(req.query.interviewStatus).trim()) return false;
      if (req.query.selectionStatus && row.selectionStatus !== String(req.query.selectionStatus).trim()) return false;
      if (req.query.pendingFrom && row.pendingFrom !== String(req.query.pendingFrom).trim()) return false;
      return true;
    });

    const total = filtered.length;
    const pagedRows = filtered.slice(skip, skip + limit);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return res.json({
      candidates: pagedRows,
      total,
      page,
      totalPages,
      rows: pagedRows,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error('[admin:candidates:all] failed', {
      message: error?.message,
      stack: error?.stack,
      adminEmail: req.user?.email,
      adminRole: req.user?.adminRole,
      query: req.query,
    });
    return res.status(500).json({
      message: 'Failed to load candidates',
      candidates: [],
      total: 0,
      page,
      totalPages: 0,
    });
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    const snapshots = await fetchAllSnapshots();
    const rows = snapshots.map(mapCandidateListRow);

    const totalApplications = rows.length;
    const eligibleCandidates = snapshots.filter((s) => Boolean(s.eligibility?.isEligible)).length;
    const profilesPendingReview = rows.filter((row) => ['submitted', 'under_review'].includes(row.profileStatus)).length;
    const paymentsPendingVerification = rows.filter((row) =>
      ['pending_verification'].includes(row.paymentStatus.initial) ||
      ['pending_verification'].includes(row.paymentStatus.program) ||
      ['pending_verification'].includes(row.paymentStatus.final)
    ).length;
    const paymentsPendingVerificationInitial = rows.filter(
      (row) => row.paymentStatus?.initial === 'pending_verification'
    ).length;
    const paymentsPendingVerificationProgram = rows.filter(
      (row) => row.paymentStatus?.program === 'pending_verification'
    ).length;
    const paymentsPendingVerificationFinal = rows.filter(
      (row) => row.paymentStatus?.final === 'pending_verification'
    ).length;
    const paymentsPendingInstructionMail = rows.filter((row) => {
      const hasProgramMailPending =
        row.paymentStatus?.initial === 'verified' &&
        row.paymentStatus?.program === 'not_started' &&
        ['uploaded', 'under_review', 'needs_revision', 'verified'].includes(String(row.documentStatus || '').toLowerCase());
      const hasFinalMailPending =
        row.selectionStatus === 'selected' &&
        row.paymentStatus?.program === 'verified' &&
        row.paymentStatus?.final === 'not_started';
      return hasProgramMailPending || hasFinalMailPending;
    }).length;
    const documentsPendingVerification = rows.filter(
      (row) =>
        row.paymentStatus?.program === 'verified' &&
        ['uploaded', 'under_review', 'needs_revision'].includes(row.documentStatus)
    ).length;
    const hiringPendingAssignment = rows.filter((row) => row.currentStageKey === 'hiring' && row.pendingFrom === 'admin').length;
    const interviewsPendingScheduled = rows.filter(
      (row) => row.currentStageKey === 'selection' && row.pendingFrom === 'admin'
    ).length;
    const selectedCandidates = rows.filter((row) => row.selectionStatus === 'selected').length;
    const rejectedCandidates = rows.filter((row) => row.selectionStatus === 'rejected').length;
    const totalRevenue = snapshots.reduce((sum, s) => {
      const paid = s.payments.filter((p) => p.status === 'completed').reduce((acc, p) => acc + (p.amount || 0), 0);
      return sum + paid;
    }, 0);

    const recentApplications = snapshots
      .map((s) => formatCandidateRow(s))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    const recentPayments = snapshots
      .flatMap((s) => s.payments.map((p) => ({
        _id: p._id,
        candidateId: s.candidate._id,
        candidateName: s.candidate.name,
        candidateEmail: s.candidate.email,
        type: p.type,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        transactionId: p.transactionId,
        date: p.createdAt,
      })))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    res.json({
      cards: {
        totalApplications,
        eligibleCandidates,
        profilesPendingReview,
        paymentsPendingVerification,
        paymentsPendingVerificationInitial,
        paymentsPendingVerificationProgram,
        paymentsPendingVerificationFinal,
        paymentsPendingInstructionMail,
        documentsPendingVerification,
        hiringPendingAssignment,
        interviewsPendingScheduled,
        selectedCandidates,
        rejectedCandidates,
        totalRevenue,
      },
      recentApplications,
      recentPayments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPaymentsOverview = async (req, res) => {
  try {
    const payments = await Payment.find({}).sort({ createdAt: -1 }).lean();

    const totals = {
      collected: 0,
      initial: 0,
      program: 0,
      final: 0,
      counts: {
        initial: 0,
        program: 0,
        final: 0,
      },
    };

    for (const payment of payments) {
      if (payment.status !== 'completed') continue;
      totals.collected += payment.amount || 0;
      if (validPaymentTypes.includes(payment.type)) {
        totals[payment.type] += payment.amount || 0;
        totals.counts[payment.type] += 1;
      }
    }

    res.json(totals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const paymentStageMatcher = (type, snapshot) => {
  if (type === 'initial') return true;
  if (type === 'program') return snapshot.hasInitial || snapshot.hasProgram || snapshot.candidate.status === 'documents_received';
  if (type === 'final') return snapshot.candidate.status === 'selected' || snapshot.hasFinal;
  return false;
};

const paymentExpectedAmount = {
  initial: Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.INITIAL_ONBOARDING_FEE].amount || 0),
  program: getProgramFeeBreakdown(null).total,
  final: Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0),
};

const paymentStatusLabel = (rawStatus = '') => {
  const normalized = String(rawStatus || '').toLowerCase();
  if (normalized === 'completed') return 'Received';
  if (normalized === 'failed') return 'Not Received';
  if (normalized === 'pending') return 'Pending Verification';
  if (normalized === 'refunded') return 'Refunded';
  return 'Pending';
};

const expectedPaymentAmountForSnapshot = (type, snapshot) => {
  if (type === 'program') {
    return getProgramFeeBreakdown(snapshot?.profile).total;
  }
  return paymentExpectedAmount[type];
};

const listPaymentsByType = async (req, res) => {
  try {
    const type = String(req.params.type || '').toLowerCase();
    if (!validPaymentTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid payment type' });
    }

    const snapshots = await fetchAllSnapshots();
    const rows = snapshots
      .filter((snapshot) => paymentStageMatcher(type, snapshot))
      .map((snapshot) => {
        const latest = snapshot.payments.find((p) => p.type === type) || null;
        const paid = Boolean(latest && latest.status === 'completed');
        return {
          candidateId: snapshot.candidate._id,
          candidateName: snapshot.candidate.name,
          email: snapshot.candidate.email,
          paymentId: latest?._id || null,
          paymentType: type,
          amount: latest?.amount ?? expectedPaymentAmountForSnapshot(type, snapshot),
          status: latest ? paymentStatusLabel(latest.status) : 'Pending',
          rawStatus: latest?.status || 'pending',
          date: latest?.createdAt || null,
          transactionId: latest?.transactionId || '—',
          method: latest?.method || '—',
          receiptUrl: latest?.receiptUrl || '',
          bankReference: latest?.bankReference || '',
        };
      });

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCandidateDetails = async (req, res) => {
  try {
    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' }).select('-passwordHash').lean();
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const [profile, documents, interviews, payments, eligibility, testimonial] = await Promise.all([
      Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate._id }).sort({ uploadedAt: -1 }).lean(),
      Interview.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Eligibility.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Testimonial.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
    ]);

    const approvalHistory = await loadApprovalHistory(candidate._id, req);
    res.json({
      candidate,
      profile,
      documents,
      interviews,
      payments,
      eligibility,
      testimonial,
      adminNotes: candidate.adminNotes || '',
      approvalHistory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminCandidateProfile = async (req, res) => {
  try {
    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' }).select('-passwordHash').lean();
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    const [profile, documents, interviews, payments, eligibility, testimonial] = await Promise.all([
      Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate._id }).sort({ uploadedAt: -1 }).lean(),
      Interview.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Eligibility.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Testimonial.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
    ]);
    const progress = deriveCandidateProgress({ candidate, profile, eligibility, documents, interviews, payments, testimonial });
    const approvalHistory = await loadApprovalHistory(candidate._id, req);
    return res.json({ candidate, profile, documents, interviews, payments, eligibility, testimonial, progress, adminNotes: candidate.adminNotes || '', approvalHistory });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getApprovalAuditHistory = async (req, res) => {
  try {
    const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    if (!permissions.includes('approval:read_audit_full') && !permissions.includes('approval:read_audit_limited')) {
      return res.status(403).json({ message: 'Audit history access is not allowed for this admin role.' });
    }
    const candidate = await User.findOne({ _id: req.params.candidateId, role: 'candidate' }).select('_id email').lean();
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    const approvalHistory = await loadApprovalHistory(candidate._id, req);
    return res.json({ candidateId: candidate._id, candidateEmail: candidate.email || '', approvalHistory });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateCandidateProfileStatus = async (req, res) => {
  try {
    const reviewPayload = ensureReviewPayload(req, res);
    if (!reviewPayload) return;
    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!validProfileStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid profile status' });
    }

    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const profile = await Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found for this candidate' });
    }

    const previousStatus = profile.status;
    profile.status = status;
    await profile.save();

    if (!candidate.stageStatuses) {
      candidate.stageStatuses = new Map();
    }

    if (status === 'accepted') {
      candidate.stageStatuses.set('evaluation', 'accepted');
      candidate.status = 'accepted';
    }
    if (status === 'rejected') {
      candidate.stageStatuses.set('evaluation', 'rejected');
      candidate.status = 'rejected';
    }
    if (status === 'under_review' || status === 'submitted') {
      candidate.stageStatuses.set('evaluation', 'under_review');
      candidate.status = 'profile_submitted';
    }

    let initialAssessmentMailSent = false;
    if (status === 'accepted' && isAdmin1Role(req.user?.adminRole)) {
      const shouldSend = !candidate.admin1ProgressionApproved;
      candidate.admin1ProgressionApproved = true;
      candidate.admin1ProgressionApprovedAt = new Date();
      candidate.admin1ProgressionApprovedBy = req.user?.email || '';
      if (shouldSend) {
        await sendInitialAssessmentApprovedEmail(candidate);
        initialAssessmentMailSent = true;
      }
    }
    await candidate.save();

    await sendStepUpdateEmail({
      to: candidate.email,
      candidateName: candidate.name || candidate.email?.split('@')[0],
      stepKey: 'evaluation',
      heading: status === 'accepted' ? 'Profile approved' : status === 'rejected' ? 'Profile rejected' : 'Profile kept under review',
      message:
        status === 'accepted'
          ? 'Your profile has been approved. Please complete the next steps from your dashboard.'
          : status === 'rejected'
            ? 'Your profile was not approved in the current review cycle. Your dashboard will now show this rejection and the next steps will remain inactive.'
            : 'Your profile is still under internal evaluation. No action is needed from you right now.',
      status,
      details: [
        { label: 'Profile Status', value: status },
        { label: 'Next Step', value: status === 'accepted' ? 'Complete the next dashboard step' : status === 'rejected' ? 'No further candidate action available' : 'Wait for final review decision' },
      ],
      cta: { label: 'View Dashboard', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/candidate-dashboard` },
    });

    const [eligibility, documents, interviews, payments, testimonial] = await Promise.all([
      Eligibility.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate._id }).sort({ uploadedAt: -1 }).lean(),
      Interview.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Testimonial.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
    ]);
    const auditLog = await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'profile_evaluation',
      sectionRecordId: String(profile._id),
      previousStatus,
      newStatus: status,
      reasonNote: reviewPayload.reasonNote,
      sourcePage: reviewPayload.sourcePage,
    });
    const progress = buildProgressSummary({ candidate, profile: profile.toObject(), eligibility, documents, interviews, payments, testimonial });

    res.json({ profile, auditLog, progress, initialAssessmentMailSent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCandidateDocumentStatus = async (req, res) => {
  try {
    const reviewPayload = ensureReviewPayload(req, res);
    if (!reviewPayload) return;
    const status = String(req.body?.status || '').trim();
    if (!validDocumentStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid document status' });
    }

    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const document = await Document.findOne({ _id: req.params.documentId, userId: candidate._id });
    if (!document) return res.status(404).json({ message: 'Document not found for this candidate' });

    const previousStatus = document.status;
    const previousComment = String(document.adminComment || '').trim();
    const incomingComment = normalizeDocumentAdminComment(req.body?.adminComment || '');
    document.status = status;
    document.adminComment = status === 'Needs Revision' ? incomingComment : '';
    await document.save();

    await sendStepUpdateEmail({
      to: candidate.email,
      candidateName: candidate.name || candidate.email?.split('@')[0],
      stepKey: 'document_verification',
      heading: status === 'Accepted' ? 'Document approved' : status === 'Needs Revision' ? 'Document needs revision' : 'Document review updated',
      message:
        status === 'Accepted'
          ? 'Your document has been approved successfully.'
          : status === 'Needs Revision'
            ? `Your document needs revision.${document.adminComment ? ` Comment from admin: ${document.adminComment}` : ''} Please upload the corrected and complete document details again from your dashboard.`
            : 'Your document review status has been updated.',
      status: String(status || '').toLowerCase().replaceAll(' ', '_'),
      details: [
        { label: 'Document Type', value: document.documentType || 'Document' },
        { label: 'Status', value: status },
        ...(document.adminComment ? [{ label: 'Admin Comment', value: document.adminComment }] : []),
      ],
      cta: { label: 'Open Documents', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/documents` },
    });

    const [profile, eligibility, documents, interviews, payments, testimonial] = await Promise.all([
      Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Eligibility.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate._id }).sort({ uploadedAt: -1 }).lean(),
      Interview.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Testimonial.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
    ]);
    const auditLog = await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'document_verification',
      sectionRecordId: String(document._id),
      previousStatus,
      newStatus: status,
      reasonNote: [reviewPayload.reasonNote, status === 'Needs Revision' && incomingComment ? `Comment: ${incomingComment}` : ''].filter(Boolean).join('\n'),
      sourcePage: reviewPayload.sourcePage,
    });
    const progress = buildProgressSummary({ candidate: candidate.toObject(), profile, eligibility, documents, interviews, payments, testimonial });

    res.json({
      document,
      previousComment,
      auditLog,
      progress,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addCandidateInterview = async (req, res) => {
  try {
    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const hiringPartner = String(req.body?.hiringPartner || '').trim();
    const role = String(req.body?.role || '').trim();
    const date = String(req.body?.date || '').trim();
    const time = String(req.body?.time || '').trim();
    const meetingLink = String(req.body?.meetingLink || '').trim();

    if (!hiringPartner || !role || !date || !time) {
      return res.status(400).json({ message: 'hiringPartner, role, date and time are required' });
    }

    const interview = await Interview.create({
      userId: candidate._id,
      hiringPartner,
      role,
      country: String(req.body?.country || 'N/A').trim() || 'N/A',
      date,
      time,
      meetingLink,
      durationMinutes: 15,
      status: 'Scheduled',
    });

    candidate.status = 'interview_scheduled';
    await candidate.save();

    await sendStepUpdateEmail({
      to: candidate.email,
      candidateName: candidate.name || candidate.email?.split('@')[0],
      stepKey: 'interviews',
      heading: 'Interview scheduled',
      message: 'Your interview has been scheduled. Please review your dashboard for details.',
      status: 'under_review',
      details: [
        { label: 'Hiring Partner', value: hiringPartner },
        { label: 'Role', value: role },
        { label: 'Date', value: date },
        { label: 'Time', value: time },
        { label: 'Duration', value: '15 minutes' },
        ...(meetingLink ? [{ label: 'Meeting Link', value: meetingLink }] : []),
      ],
      cta: { label: 'Open Interviews', url: `${getFrontendBaseUrl()}/interviews` },
      eventType: 'interview',
    });

    return res.status(201).json({ message: 'Interview scheduled', interview });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const reviewPayload = ensureReviewPayload(req, res);
    if (!reviewPayload) return;
    const { paymentId } = req.params;
    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!validPaymentStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const existingPayment = await Payment.findById(paymentId);
    if (!existingPayment) return res.status(404).json({ message: 'Payment not found' });
    const previousStatus = existingPayment.status;
    const hadReceiptBeforeCompletion = Boolean(existingPayment.receiptId);
    existingPayment.status = status;
    await existingPayment.save();
    const payment = existingPayment;
    const candidate = await User.findById(payment.userId);

    if (status === 'completed') {
      if (payment.type === 'program') {
        await User.findByIdAndUpdate(payment.userId, { status: 'program_payment_complete' });
      }
      if (payment.type === 'final') {
        await User.findByIdAndUpdate(payment.userId, { status: 'final_payment_complete' });
      }
    }

    const stage = getPaymentStage(payment);
    let generatedInvoice = null;
    let generatedReceipt = null;
    if (status === 'completed' && candidate && stage) {
      if (stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE) {
        payment.nonRefundableAmount = Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.INITIAL_ONBOARDING_FEE].amount || 0);
        payment.refundableAmount = 0;
        payment.refundStatus = 'non_refundable';
      }
      if (stage === PAYMENT_STAGES.FIRST_INSTALLMENT) {
        const firstAmt = Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FIRST_INSTALLMENT].amount || 0);
        const deduction = 200;
        const refundableIfNotSelected = Math.max(0, firstAmt - deduction);
        if (candidate.selectedStatus === 'not_selected') {
          payment.nonRefundableAmount = deduction;
          payment.refundableAmount = refundableIfNotSelected;
          payment.refundStatus = 'partially_refundable';
        } else if (candidate.selectedStatus === 'selected') {
          payment.nonRefundableAmount = firstAmt;
          payment.refundableAmount = 0;
          payment.refundStatus = 'non_refundable';
        } else {
          payment.nonRefundableAmount = deduction;
          payment.refundableAmount = refundableIfNotSelected;
          payment.refundStatus = 'conditional';
        }
      }

      generatedInvoice = await ensureInvoiceForPaymentStage({
        candidate,
        stage,
        amountReceived: stage === PAYMENT_STAGES.FINAL_PAYMENT ? Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0) : 0,
      });
      if (generatedInvoice) {
        payment.invoiceId = generatedInvoice._id;
      }
      generatedReceipt = await ensureReceiptForCompletedPayment({ candidate, payment, stage });
      if (!hadReceiptBeforeCompletion || previousStatus !== status) {
        await sendPaymentReceiptDocumentEmail({
          candidate,
          payment,
          receipt: generatedReceipt,
          stage,
          invoice: generatedInvoice,
        });
      }
    }

    await sendStepUpdateEmail({
      to: candidate?.email,
      candidateName: candidate?.name || candidate?.email?.split('@')[0],
      stepKey: payment.type === 'initial' ? 'initial_payment' : payment.type === 'program' ? 'program_payment' : 'final_payment',
      heading: status === 'completed' ? 'Payment approved' : status === 'failed' ? 'Payment rejected' : 'Payment verification updated',
      message:
        status === 'completed'
          ? payment.type === 'program'
            ? 'Your payment has been approved. Your case is now pending document verification.'
            : 'Your payment has been approved. Please continue with the next steps shown on your dashboard.'
          : status === 'failed'
            ? 'Your payment verification was not approved. Please contact support and wait for updated payment instructions by email.'
            : 'Your payment verification status has been updated and is still pending completion.',
      status,
      details: [
        { label: 'Payment Type', value: payment.type },
        { label: 'Amount', value: `${payment.currency || 'USD'} ${payment.amount || 0}` },
        { label: 'Transaction ID', value: payment.transactionId || '—' },
      ],
      cta: {
        label: status === 'failed' ? 'Contact Support' : 'Open Dashboard',
        url: `${getFrontendBaseUrl()}/${status === 'failed' ? (payment.type === 'initial' ? 'initial-payment' : 'candidate-dashboard') : 'candidate-dashboard'}`,
      },
    });

    if (status === 'completed' && String(payment.type || '').toLowerCase() === 'initial') {
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
      await sendEmail({
        to: candidate?.email,
        subject: 'NextStep Talent – Payment Successfully Received',
        text,
        html: text.replaceAll('\n', '<br/>'),
        fromEmail: 'noreply@nextsteptalent.net',
        fromName: 'NextStep Talent Team',
        templateKey: 'payment_500_received',
        relatedCandidateId: candidate?._id,
      });
    }

    if (status === 'completed' && String(payment.type || '').toLowerCase() === 'program') {
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
      await sendEmail({
        to: candidate?.email,
        subject: 'NextStep Talent – Payment Confirmation & Verification Process',
        text,
        html: text.replaceAll('\n', '<br/>'),
        fromEmail: 'noreply@nextsteptalent.net',
        fromName: 'NextStep Talent Team',
        templateKey: 'payment_first_installment_received',
        relatedCandidateId: candidate?._id,
      });
    }

    if (status === 'completed' && String(payment.type || '').toLowerCase() === 'final') {
      const text = `Dear Candidate,

We confirm that your final payment has been successfully received.

Your onboarding process is now progressing to the final coordination and completion stage.

Our team will continue with the necessary employer coordination, onboarding formalities, and related operational processes as applicable to your profile and opportunity alignment.

Should any additional documentation, instructions, or process-related actions be required from your end, you will receive further communication from the operations team.

We appreciate your cooperation and professionalism throughout the process and wish you success in the next stage of your professional journey.

Regards,  
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;
      await sendEmail({
        to: candidate?.email,
        subject: 'NextStep Talent – Final Payment Confirmation',
        text,
        html: text.replaceAll('\n', '<br/>'),
        fromEmail: 'noreply@nextsteptalent.net',
        fromName: 'NextStep Talent Team',
        templateKey: 'final_payment_received',
        relatedCandidateId: candidate?._id,
      });
    }

    if (status === 'completed' && String(payment.type || '').toLowerCase() === 'program') {
      const evaluationAdmins = getEvaluationAdminEmails();
      const candidateName = candidate?.name || candidate?.email?.split('@')[0] || 'Candidate';
      await sendAdminNotification({
        to: evaluationAdmins,
        subject: `NextStep Talent Document Verification Pending / ${candidateName}`,
        lines: [
          'Program fee payment receipt has been approved and document verification is now pending.',
          `Candidate: ${candidateName}`,
          `Candidate Email: ${candidate?.email || 'N/A'}`,
          `Candidate ID: ${String(candidate?._id || '')}`,
          `Payment Type: Program Fee (First Installment)`,
          `Approved By: ${req.user?.name || req.user?.email || 'Admin 1'}`,
          `Approved At: ${new Date().toISOString()}`,
          `Review Link: ${getFrontendBaseUrl()}/admin/candidates/${String(candidate?._id || '')}?tab=documents&review=document-verification`,
          'Next Action: Review candidate documents and approve/reject verification from admin panel.',
        ],
        fromType: 'noreply',
      });
    }

    const [profile, eligibility, documents, interviews, payments, testimonial, refreshedCandidate] = await Promise.all([
      Profile.findOne({ userId: candidate?._id }).sort({ createdAt: -1 }).lean(),
      Eligibility.findOne({ userId: candidate?._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate?._id }).sort({ uploadedAt: -1 }).lean(),
      Interview.find({ userId: candidate?._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate?._id }).sort({ createdAt: -1 }).lean(),
      Testimonial.findOne({ userId: candidate?._id }).sort({ createdAt: -1 }).lean(),
      User.findById(candidate?._id).lean(),
    ]);
    const auditLog = await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'payment_verification',
      sectionRecordId: String(payment._id),
      previousStatus,
      newStatus: status,
      reasonNote: reviewPayload.reasonNote,
      sourcePage: reviewPayload.sourcePage,
    });
    const progress = buildProgressSummary({ candidate: refreshedCandidate, profile, eligibility, documents, interviews, payments, testimonial });

    res.json({ payment, auditLog, progress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCandidateNotes = async (req, res) => {
  try {
    const notes = String(req.body?.notes || '').trim();
    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' }).select('-passwordHash');

    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    const previousNotes = String(candidate.adminNotes || '').trim();
    candidate.adminNotes = notes;
    await candidate.save();

    const auditLog = await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType: 'admin_notes',
      sectionRecordId: 'admin_notes',
      previousStatus: previousNotes,
      newStatus: notes,
      decision: previousNotes === notes ? 'pending' : 'changed',
      reasonNote: notes || '(cleared)',
      sourcePage: String(req.body?.sourcePage || '/admin/candidates/notes').trim(),
    });

    res.json({ adminNotes: candidate.adminNotes || '', auditLog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCandidateStageDecision = async (req, res) => {
  try {
    const stageKey = String(req.params?.stageKey || '').trim().toLowerCase();
    const status = String(req.body?.status || '').trim().toLowerCase();
    const hiringPartner = String(req.body?.hiringPartner || '').trim();

    if (!validStageKeys.includes(stageKey)) {
      return res.status(400).json({ message: `Invalid stage key: ${stageKey}` });
    }
    if (!validStageDecisionStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid stage status' });
    }
    const reviewPayload = allowedSensitiveStageKeys.includes(stageKey) ? ensureReviewPayload(req, res) : {
      reasonNote: sanitizeReasonNote(req.body?.reasonNote || 'Stage workflow update'),
      sourcePage: String(req.body?.sourcePage || '').trim(),
    };
    if (!reviewPayload) return;

    const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const needsPermissionByStage = {
      evaluation: 'evaluation:approve',
      'document-verification': 'documents:verify',
    };
    const requiredPermission = needsPermissionByStage[stageKey];
    if (requiredPermission && !permissions.includes(requiredPermission)) {
      return res.status(403).json({ message: `Missing permission: ${requiredPermission}` });
    }
    if (stageKey === 'selection' && !['super_admin', 'payment_admin', 'payments_admin'].includes(String(req.user?.adminRole || ''))) {
      return res.status(403).json({ message: 'Only super admin or payment admin can publish final selection decisions.' });
    }

    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    const previousCandidateStatus = candidate.status;
    const previousStageStatus = readStageDecision(candidate, stageKey);

    if (!candidate.stageStatuses) {
      candidate.stageStatuses = new Map();
    }
    candidate.stageStatuses.set(stageKey, status);

    const actorRoleNormalized = String(req.user?.adminRole || '').trim().toLowerCase();
    const isAdmin2Actor = actorRoleNormalized === 'evaluation_admin';
    const isAdmin3Actor = actorRoleNormalized === 'operations_admin';

    if (stageKey === 'evaluation') {
      const profile = await Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 });
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found for this candidate' });
      }

      if (isAdmin2Actor && status === 'accepted') {
        // Admin 2 approves: keep profile under_review, mark admin2 approved, notify Admin 3
        profile.status = 'under_review';
        candidate.status = 'profile_submitted';
        candidate.stageStatuses.set('evaluation', 'under_review');
        candidate.admin2EvaluationApproved = true;
        candidate.admin2EvaluationApprovedAt = new Date();
        candidate.admin2EvaluationApprovedBy = req.user?.email || '';
        await profile.save();
        try {
          const workflow = getWorkflowConfig();
          await sendAdminNotification({
            to: workflow.admin3 ? [workflow.admin3] : getOperationsAdminEmails(),
            subject: `NextStep Talent Candidate For Approval / ${candidate.name || candidate.email?.split('@')[0] || 'Candidate'}`,
            lines: [
              'Admin 2 (Evaluation Admin) has reviewed and approved the candidate. Admin 3 final approval is now required.',
              `Candidate: ${candidate.name || candidate.email?.split('@')[0] || 'N/A'}`,
              `Email: ${candidate.email || 'N/A'}`,
              `Candidate ID: ${String(candidate._id)}`,
              `Review Link: ${getFrontendBaseUrl()}/admin/candidates/${String(candidate._id)}?tab=profile&review=evaluation`,
            ],
            fromType: 'noreply',
          });
        } catch (notifyErr) {
          console.error('Admin 3 notification failed:', notifyErr.message);
        }
      } else if (isAdmin3Actor && status === 'accepted') {
        // Admin 3 approves: finalize profile, send account creation invite
        profile.status = 'accepted';
        candidate.status = 'accepted';
        candidate.stageStatuses.set('evaluation', 'accepted');
        candidate.admin3EvaluationApproved = true;
        candidate.admin3EvaluationApprovedAt = new Date();
        candidate.admin3EvaluationApprovedBy = req.user?.email || '';
        await profile.save();
      } else if (status === 'rejected') {
        profile.status = 'rejected';
        candidate.status = 'rejected';
        candidate.stageStatuses.set('evaluation', 'rejected');
        await profile.save();
      } else if (status === 'under_review') {
        profile.status = 'under_review';
        candidate.status = 'profile_submitted';
        candidate.stageStatuses.set('evaluation', 'under_review');
        await profile.save();
      } else if (!isAdmin2Actor && !isAdmin3Actor && status === 'accepted') {
        // Super/payments admin direct approval
        profile.status = 'accepted';
        candidate.status = 'accepted';
        candidate.stageStatuses.set('evaluation', 'accepted');
        await profile.save();
      }
    }

    let initialAssessmentMailSent = false;

    if (stageKey === 'evaluation' && status === 'accepted' && isAdmin3Actor) {
      // Admin 3 final approval: send account creation invite to candidate
      const shouldSend = !candidate.admin3EvaluationApproved || !candidate.accountCreationInviteSent;
      candidate.accountCreationInviteSent = true;
      candidate.accountCreationInviteSentAt = new Date();
      if (shouldSend) {
        const inviteUrl = `${getFrontendBaseUrl()}/signup?email=${encodeURIComponent(candidate.email)}&invite=1`;
        const inviteText = `Dear ${String(candidate.name || 'Candidate').trim()},\n\nYour profile has been reviewed and approved.\n\nYou may now create your candidate account using the link below.\n\nEmail: ${candidate.email}\nCreate Account Link: ${inviteUrl}\n\nAfter creating your account, you will receive email verification instructions and can then access your dashboard.\n\nRegards,\nNextStep Talent Team\n\nThis is an official communication from NextStep Talent.`;
        await sendEmail({
          to: candidate.email,
          subject: 'NextStep Talent – Account Creation Invitation',
          text: inviteText,
          html: inviteText.replaceAll('\n', '<br/>'),
          fromEmail: 'noreply@nextsteptalent.net',
          fromName: 'NextStep Talent Team',
          templateKey: 'profile_account_creation_invite',
          relatedCandidateId: candidate._id,
        });
        initialAssessmentMailSent = true;
      }
    } else if (stageKey === 'evaluation' && status === 'accepted' && isAdmin1Role(req.user?.adminRole) && !isAdmin2Actor && !isAdmin3Actor) {
      // Super/payments admin direct approval: send initial assessment approved email
      const shouldSend = !candidate.admin1ProgressionApproved;
      candidate.admin1ProgressionApproved = true;
      candidate.admin1ProgressionApprovedAt = new Date();
      candidate.admin1ProgressionApprovedBy = req.user?.email || '';
      if (shouldSend) {
        await sendInitialAssessmentApprovedEmail(candidate);
        initialAssessmentMailSent = true;
      }
    }

    if (stageKey === 'document-verification') {
      if (status === 'accepted') {
        candidate.status = 'documents_received';
      } else if (status === 'under_review') {
        candidate.status = 'documents_submitted';
      }
    }

    if (stageKey === 'hiring') {
      if (status === 'accepted') {
        if (!hiringPartner) {
          return res.status(400).json({ message: 'Hiring partner is required' });
        }
        candidate.assignedHiringPartner = hiringPartner;
        candidate.status = 'sent_to_partners';
      } else if (status === 'under_review') {
        candidate.assignedHiringPartner = '';
      }
    }

    if (stageKey === 'selection') {
      if (status === 'accepted') {
        candidate.status = 'selected';
      } else if (status === 'rejected') {
        candidate.status = 'not_selected';
      }
    }

    if (stageKey === 'testimonials' && status === 'accepted') {
      candidate.status = 'process_complete';
    }

    await candidate.save();

    if (stageKey === 'testimonials' && status === 'accepted' && previousCandidateStatus !== 'process_complete') {
      const text = `Dear Candidate,

We are pleased to confirm that your onboarding and coordination process with NextStep Talent has been successfully completed.

We appreciate your cooperation, professionalism, and timely coordination throughout the various stages of the process.

As you move forward into the next phase of your professional journey, we would like to extend our best wishes for your future success and growth.

Should any additional process-related communication be required, the relevant team will reach out to you separately where applicable.

Thank you for choosing NextStep Talent.

Regards,  
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;
      await sendEmail({
        to: candidate.email,
        subject: 'NextStep Talent – Process Completion & Best Wishes',
        text,
        html: text.replaceAll('\n', '<br/>'),
        fromEmail: 'noreply@nextsteptalent.net',
        fromName: 'NextStep Talent Team',
        templateKey: 'process_completion_best_wishes',
        relatedCandidateId: candidate._id,
      });
    }

    const workflow = getWorkflowConfig();
    const actorEmail = normalizeEmail(req.user?.email || '');

    if (stageKey === 'document-verification' && status === 'accepted') {
      const actorRole = String(req.user?.adminRole || '').trim().toLowerCase();
      const isEvaluationActor = actorRole === 'evaluation_admin' || actorEmail === workflow.admin2;
      if (isEvaluationActor) {
        try {
          const operationsAdmins = getOperationsAdminEmails();
          await sendAdminNotification({
            to: operationsAdmins.length ? operationsAdmins : workflow.operationsAdmins,
            subject: `NextStep Talent Candidate Ready For Hiring Partner Transfer / ${candidate.name || candidate.email?.split('@')[0] || 'Candidate'}`,
            lines: [
              'Evaluation admin has completed document verification and approved this candidate.',
              'Next Action: Transfer the candidate to hiring partner.',
              `Candidate: ${candidate.name || candidate.email?.split('@')[0] || 'N/A'}`,
              `Email: ${candidate.email || 'N/A'}`,
              `Candidate ID: ${String(candidate._id)}`,
            ],
            fromType: 'noreply',
          });
        } catch (error) {
          console.error('Operations admin transfer notification failed:', error.message);
        }
      }
    }

    if (stageKey === 'selection' && actorEmail === workflow.admin3) {
      try {
        const completionRecipients = [...new Set([...getPaymentsAdminEmails(), ...getEvaluationAdminEmails()])];
        const interviewsForCandidate = await Interview.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean();
        const interviewConducted = interviewsForCandidate.length ? 'Yes' : 'No';
        await sendAdminNotification({
          to: completionRecipients,
          subject: `Admin 3 Review Completed / ${candidate.name || candidate.email?.split('@')[0] || 'Candidate'}`,
          lines: [
            `Approved / Rejected: ${status === 'rejected' ? 'Rejected' : 'Approved'}`,
            `Interview Conducted: ${interviewConducted}`,
            `Reviewer Notes: ${reviewPayload?.reasonNote || 'N/A'}`,
            `Timestamp: ${new Date().toISOString()}`,
            `Candidate: ${candidate.name || candidate.email?.split('@')[0] || 'N/A'}`,
            `Email: ${candidate.email || 'N/A'}`,
          ],
          fromType: 'noreply',
          templateKey: 'internal_admin3_review_completed',
        });
      } catch (error) {
        console.error('Admin 1/2 completion notification failed:', error.message);
      }
    }

    const stageToEmailStep = {
      evaluation: 'evaluation',
      declaration: 'declaration',
      documents: 'documents',
      'background-verification': 'documents',
      'document-verification': 'document_verification',
      hiring: 'hiring',
      selection: 'selection',
      testimonials: 'testimonial',
    };

    const stageEmailConfig = (() => {
      if (stageKey === 'selection') {
        return {
          heading: status === 'accepted' ? 'Selection result: approved' : status === 'rejected' ? 'Selection result: not selected' : 'Selection result under review',
          message:
            status === 'accepted'
              ? 'Congratulations. You have been selected. Please pay the required fees shown in your dashboard to continue.'
              : status === 'rejected'
                ? 'Your selection result has been published and you were not selected in this cycle.'
                : 'Your selection result is still under review.',
        };
      }
      if (stageKey === 'document-verification') {
        return {
          heading: status === 'accepted' ? 'Document verification approved' : status === 'rejected' ? 'Document verification rejected' : 'Document verification updated',
          message: status === 'accepted' ? 'Your documents have been verified successfully.' : 'Your document verification status has been updated.',
        };
      }
      return {
        heading: 'Stage decision updated by admin',
        message: 'A stage decision has been updated in your process.',
      };
    })();

    // For evaluation stage: Admin 2 never emails candidate. Admin 3 sends account creation invite (handled above).
    // Neither sends a generic step-update email for evaluation.
    const skipCandidateStepEmail = stageKey === 'evaluation' && (isAdmin2Actor || isAdmin3Actor);
    if (!skipCandidateStepEmail) {
      await sendStepUpdateEmail({
        to: candidate.email,
        candidateName: candidate.name || candidate.email?.split('@')[0],
        stepKey: stageToEmailStep[stageKey] || 'profile',
        stepName: stagePageLabelMap[stageKey] || stageKey,
        heading: stageEmailConfig.heading,
        message: stageEmailConfig.message,
        status,
        details: [
          { label: 'Stage', value: stagePageLabelMap[stageKey] || stageKey },
          { label: 'Decision', value: status },
          ...(hiringPartner ? [{ label: 'Hiring Partner', value: hiringPartner }] : []),
        ],
        cta: { label: 'Open Dashboard', url: `${getFrontendBaseUrl()}/candidate-dashboard` },
      });
    }

    const [profile, eligibility, documents, interviews, payments, testimonial, refreshedCandidate] = await Promise.all([
      Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Eligibility.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Document.find({ userId: candidate._id }).sort({ uploadedAt: -1 }).lean(),
      Interview.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      Testimonial.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean(),
      User.findById(candidate._id).lean(),
    ]);
    const auditLog = await createApprovalAuditLog(req, {
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      approvalType:
        stageKey === 'selection'
          ? 'final_selection'
          : stageKey === 'evaluation'
              ? 'profile_evaluation'
              : stageKey === 'document-verification'
                ? 'document_verification'
                : 'stage_action',
      sectionRecordId: stageKey,
      previousStatus: `${previousStageStatus || previousCandidateStatus}`,
      newStatus: `${status || refreshedCandidate?.status}`,
      reasonNote: reviewPayload.reasonNote,
      sourcePage: reviewPayload.sourcePage,
    });
    const progress = buildProgressSummary({ candidate: refreshedCandidate, profile, eligibility, documents, interviews, payments, testimonial });

    return res.json({
      candidateId: candidate._id,
      stageKey,
      status,
      stageStatuses: candidate.stageStatuses,
      auditLog,
      progress,
      initialAssessmentMailSent,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const initiateCandidateRefund = async (req, res) => {
  try {
    if (!isAdmin1Role(req.user?.adminRole)) {
      return res.status(403).json({ message: 'Only Admin 1 can initiate refunds.' });
    }
    const candidate = await User.findOne({ _id: req.params.id, role: 'candidate' });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const paymentIds = Array.isArray(req.body?.paymentIds) ? req.body.paymentIds.map(String).filter(Boolean) : [];
    if (!paymentIds.length) {
      return res.status(400).json({ message: 'paymentIds is required' });
    }

    const adminDeduction = Number(req.body?.adminDeduction ?? 300);
    if (!Number.isFinite(adminDeduction) || adminDeduction < 0) {
      return res.status(400).json({ message: 'adminDeduction must be a non-negative number' });
    }

    const payments = await Payment.find({ _id: { $in: paymentIds }, userId: candidate._id }).sort({ createdAt: -1 });
    if (!payments.length) return res.status(404).json({ message: 'No matching payments found for candidate' });

    const alreadyRefunded = payments.filter((p) => String(p.status || '').toLowerCase() === 'refunded');
    if (alreadyRefunded.length) {
      return res.status(409).json({ message: 'One or more selected payments are already refunded' });
    }

    const refundable = payments.filter((p) => ['completed', 'verified', 'paid'].includes(String(p.status || '').toLowerCase()));
    if (refundable.length !== payments.length) {
      return res.status(409).json({ message: 'All selected payments must be in completed/verified/paid status' });
    }

    for (const payment of payments) {
      payment.status = 'refunded';
      payment.refundStatus = 'sent';
      payment.refundReason = 'visa_refusal';
      await payment.save();
    }

    const originalPaymentReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const approvedRefundAmount = Math.max(0, originalPaymentReceived - adminDeduction);

    const text = `Dear Candidate,

This is to confirm that your refund request has been reviewed and approved in accordance with the applicable terms and conditions of the service agreement.

Refund Summary:

Original Payment Received: USD ${originalPaymentReceived}
Administrative Deduction: USD ${adminDeduction}
Approved Refund Amount: USD ${approvedRefundAmount}

The refund process has now been initiated.

Please note:
- Refund timelines may vary depending on banking channels and international transaction processing timelines.
- Any intermediary banking delays or processing timelines remain outside the control of NextStep Talent.

You will be notified once the refund transaction has been completed from our end.

Regards,  
NextStep Talent Team

This is an automated email. Please do not reply to this message.`;

    await sendEmail({
      to: candidate.email,
      subject: 'NextStep Talent – Refund Approved & Initiated',
      text,
      html: text.replaceAll('\n', '<br/>'),
      fromEmail: 'noreply@nextsteptalent.net',
      fromName: 'NextStep Talent Team',
      templateKey: 'refund_initiated',
      relatedCandidateId: candidate._id,
    });

    return res.status(201).json({
      message: 'Refund marked and email sent',
      paymentIds: payments.map((p) => String(p._id)),
      originalPaymentReceived,
      adminDeduction,
      approvedRefundAmount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listCandidatesByStage,
  listAllCandidates,
  getDashboardSummary,
  getPaymentsOverview,
  listPaymentsByType,
  getCandidateDetails,
  getAdminCandidateProfile,
  getApprovalAuditHistory,
  updateCandidateProfileStatus,
  updateCandidateDocumentStatus,
  addCandidateInterview,
  updatePaymentStatus,
  updateCandidateNotes,
  updateCandidateStageDecision,
  initiateDocumentationStage,
  initiateCandidatePaymentInstruction,
  initiateCandidateRefund,
};
