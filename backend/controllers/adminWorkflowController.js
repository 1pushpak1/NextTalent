const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');
const InterviewSlot = require('../models/InterviewSlot');
const InterviewBooking = require('../models/InterviewBooking');
const { ADMIN_ROLES, PAYMENT_STAGES, EMAIL_TEMPLATE_KEYS, LEGACY_PAYMENT_TYPE_TO_STAGE } = require('../constants/workflow');
const { normalizeAdminRole } = require('../constants/workflow');
const { getPaymentsAdminEmails, getEvaluationAdminEmails, getOperationsAdminEmails, getSuperAdminEmails } = require('../utils/adminRoleEmails');
const { sendTransactionalEmailSafe } = require('../services/emailService');
const { createAuditLog } = require('../services/auditService');
const { generateInvoiceForStage, generateReceiptForPayment } = require('../services/billingPdfService');
const { initiateBackgroundCheck } = require('../services/sterlingService');
const { wrapHtml, applicationStatusUpdate, websiteUrl } = require('../services/emailTemplateService');
const { candidateInterviewEligible } = require('./candidateController');

const FRONTEND_BASE = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
const adminCandidateLink = (candidateId) => `${FRONTEND_BASE}/admin/candidates/${candidateId}`;

const resolveCandidate = async (candidateId) => {
  if (!mongoose.Types.ObjectId.isValid(candidateId)) return null;
  return User.findOne({ _id: candidateId, role: 'candidate' });
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
    await sendTransactionalEmailSafe({
      to: operationsAdmins,
      subject: `NextStep Talent Candidate For Approval / ${candidate.name || candidate.email.split('@')[0]}`,
      text: [
        `Candidate Name: ${candidate.name || 'N/A'}`,
        `Candidate Email: ${candidate.email}`,
        `Candidate ID: ${candidate.candidateId || String(candidate._id)}`,
        `Evaluation Approval Timestamp: ${candidate.evaluationApprovedAt.toISOString()}`,
        `Approved By: ${req.user.name || req.user.email}`,
        `Action Link: ${adminCandidateLink(candidate._id)}`,
        'Required Action: approve with interview required, approve with interview not required, or reject.',
      ].join('\n'),
      html: wrapHtml({
        title: 'Candidate Evaluation Approved',
        bodyHtml: `<p>Admin evaluation approved. Operations decision is required.</p><p><b>Candidate:</b> ${candidate.name || 'N/A'}<br/><b>Email:</b> ${candidate.email}<br/><b>Candidate ID:</b> ${candidate.candidateId || String(candidate._id)}<br/><b>Approved At:</b> ${candidate.evaluationApprovedAt.toISOString()}<br/><b>Approved By:</b> ${req.user.name || req.user.email}<br/><b>Action Link:</b> <a href="${adminCandidateLink(candidate._id)}">Open Candidate</a></p>`,
      }),
      templateKey: EMAIL_TEMPLATE_KEYS.EVALUATION_APPROVED_NOTIFY_OPERATIONS,
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

    candidate.operationsStatus = 'completed';
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

    const recipients = [...new Set([...getSuperAdminEmails(), ...getEvaluationAdminEmails()])];
    await sendTransactionalEmailSafe({
      to: recipients,
      subject: `NextStep Talent Admin 3 Process Completed / ${candidate.name || candidate.email.split('@')[0]}`,
      text: [
        `Candidate Name: ${candidate.name || 'N/A'}`,
        `Candidate ID: ${candidate.candidateId || String(candidate._id)}`,
        `Decision: ${normalizedDecision}`,
        `Interview Status: ${normalizedDecision === 'interview_required' ? 'required' : normalizedDecision === 'interview_not_required' ? 'not_required' : 'not_applicable'}`,
        `Sterling Verification Status: ${candidate.backgroundCheckStatus || 'not_started'}`,
        `Completed At: ${candidate.operationsCompletedAt.toISOString()}`,
        `Candidate Link: ${adminCandidateLink(candidate._id)}`,
        'Admin 3 has completed the operations task for this candidate.',
      ].join('\n'),
      html: wrapHtml({
        title: 'Admin 3 Process Completed',
        bodyHtml: `<p>Operations decision completed for candidate.</p><p><b>Candidate:</b> ${candidate.name || 'N/A'}<br/><b>Candidate ID:</b> ${candidate.candidateId || String(candidate._id)}<br/><b>Decision:</b> ${normalizedDecision}<br/><b>Interview Status:</b> ${normalizedDecision === 'interview_required' ? 'required' : normalizedDecision === 'interview_not_required' ? 'not_required' : 'not_applicable'}<br/><b>Sterling Verification:</b> ${candidate.backgroundCheckStatus || 'not_started'}<br/><b>Completed At:</b> ${candidate.operationsCompletedAt.toISOString()}<br/><b>Candidate Link:</b> <a href="${adminCandidateLink(candidate._id)}">Open Candidate</a></p>`,
      }),
      templateKey: EMAIL_TEMPLATE_KEYS.OPERATIONS_DECISION_COMPLETED,
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

    let invoice = await Invoice.findOne({
      candidateId: candidate._id,
      paymentStage: PAYMENT_STAGES.FIRST_INSTALLMENT,
    }).sort({ createdAt: -1 });

    if (!invoice) {
      invoice = await generateInvoiceForStage({
        candidate,
        stage: PAYMENT_STAGES.FIRST_INSTALLMENT,
      });
      candidate.invoices = [...new Set([...(candidate.invoices || []).map(String), String(invoice._id)])];
      await candidate.save();
    }

    const invoiceUrl = `${websiteUrl()}${invoice.pdfUrl}`;
    const mail = applicationStatusUpdate({
      candidateName: candidate.name,
      selected: true,
      withPayment: true,
      invoiceUrl,
    });

    await sendTransactionalEmailSafe({
      to: candidate.email,
      ...mail,
      templateKey: EMAIL_TEMPLATE_KEYS.CANDIDATE_SELECTED_PAYMENT,
      relatedCandidateId: candidate._id,
    });

    await sendTransactionalEmailSafe({
      to: candidate.email,
      subject: 'Invoice - Career Development Services Part I',
      text: [`Your Stage 1 invoice is ready.`, `Invoice Number: ${invoice.invoiceNumber}`, `Invoice Link: ${invoiceUrl}`].join('\n'),
      html: wrapHtml({
        title: 'Invoice - Career Development Services Part I',
        bodyHtml: `<p>Your Stage 1 invoice is ready.</p><p><b>Invoice Number:</b> ${invoice.invoiceNumber}<br/><b>Invoice Link:</b> <a href="${invoiceUrl}">${invoiceUrl}</a></p>`,
      }),
      templateKey: EMAIL_TEMPLATE_KEYS.INVOICE_STAGE_1,
      relatedCandidateId: candidate._id,
    });

    await createAuditLog({
      req,
      actorType: 'admin',
      actorId: req.user.email,
      actorRole: req.user.adminRole,
      candidateId: candidate._id,
      action: 'candidate_selected_and_stage1_invoice_sent',
      previousValue: previous,
      newValue: {
        selectedStatus: candidate.selectedStatus,
        status: candidate.status,
        invoiceId: invoice._id,
      },
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
      },
    });

    return res.json({ message: 'Candidate marked selected and payment instruction sent', candidate, invoice });
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
    candidate.status = 'not_selected';
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
      action: 'candidate_not_selected_notified',
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

    const amountReceived = paymentStage === PAYMENT_STAGES.FINAL_PAYMENT ? 3100 : 0;
    const invoice = await generateInvoiceForStage({ candidate, stage: paymentStage, amountReceived });
    candidate.invoices = [...new Set([...(candidate.invoices || []).map(String), String(invoice._id)])];
    await candidate.save();

    await sendTransactionalEmailSafe({
      to: candidate.email,
      subject:
        paymentStage === PAYMENT_STAGES.FIRST_INSTALLMENT
          ? 'Invoice - Career Development Services Part I'
          : 'Invoice - Career Development Services Part II',
      text: [`Invoice Number: ${invoice.invoiceNumber}`, `Invoice Link: ${websiteUrl()}${invoice.pdfUrl}`].join('\n'),
      html: wrapHtml({
        title:
          paymentStage === PAYMENT_STAGES.FIRST_INSTALLMENT
            ? 'Invoice - Career Development Services Part I'
            : 'Invoice - Career Development Services Part II',
        bodyHtml: `<p>Your invoice is ready.</p><p><b>Invoice Number:</b> ${invoice.invoiceNumber}<br/><b>Invoice Link:</b> <a href="${websiteUrl()}${invoice.pdfUrl}">${websiteUrl()}${invoice.pdfUrl}</a></p>`,
      }),
      templateKey:
        paymentStage === PAYMENT_STAGES.FIRST_INSTALLMENT
          ? EMAIL_TEMPLATE_KEYS.INVOICE_STAGE_1
          : EMAIL_TEMPLATE_KEYS.INVOICE_STAGE_2,
      relatedCandidateId: candidate._id,
    });

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
        payment.nonRefundableAmount = 3100;
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
          amountReceived: stage === PAYMENT_STAGES.FINAL_PAYMENT ? 3100 : 0,
        });
      }
      payment.invoiceId = invoice._id;
      candidate.invoices = [...new Set([...(candidate.invoices || []).map(String), String(invoice._id)])];
    }

    let receipt = null;
    if (status === 'verified') {
      receipt = await generateReceiptForPayment({ candidate, payment, stage });
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
      await sendTransactionalEmailSafe({
        to: candidate.email,
        subject:
          stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE
            ? 'Payment Receipt - Initial Onboarding & Profile Evaluation Fee'
            : stage === PAYMENT_STAGES.FIRST_INSTALLMENT
              ? 'Payment Receipt - First Installment'
              : 'Payment Receipt - Final Payment',
        text: [
          `Receipt Number: ${receipt.receiptNumber}`,
          `Receipt Link: ${websiteUrl()}${receipt.pdfUrl}`,
        ].join('\n'),
        html: wrapHtml({
          title: 'Payment Receipt',
          bodyHtml: `<p>Your payment receipt is generated.</p><p><b>Receipt Number:</b> ${receipt.receiptNumber}<br/><b>Receipt Link:</b> <a href="${websiteUrl()}${receipt.pdfUrl}">${websiteUrl()}${receipt.pdfUrl}</a></p>`,
        }),
        templateKey:
          stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE
            ? EMAIL_TEMPLATE_KEYS.RECEIPT_INITIAL
            : stage === PAYMENT_STAGES.FIRST_INSTALLMENT
              ? EMAIL_TEMPLATE_KEYS.RECEIPT_FIRST
              : EMAIL_TEMPLATE_KEYS.RECEIPT_FINAL,
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
          `Review Link: ${adminCandidateLink(candidate._id)}?tab=documents&review=document-verification`,
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
<b>Review Link:</b> <a href="${adminCandidateLink(candidate._id)}?tab=documents&review=document-verification">${adminCandidateLink(candidate._id)}?tab=documents&review=document-verification</a></p>
<p>Next Action: Review candidate documents and approve/reject verification from admin panel.</p>`,
        }),
        templateKey: 'document_verification_pending_admin2',
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
