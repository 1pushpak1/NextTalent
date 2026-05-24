const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');
const AgreementConsent = require('../models/AgreementConsent');
const InterviewSlot = require('../models/InterviewSlot');
const InterviewBooking = require('../models/InterviewBooking');
const { PAYMENT_STAGES, LEGACY_PAYMENT_TYPE_TO_STAGE, EMAIL_TEMPLATE_KEYS } = require('../constants/workflow');
const { getPaymentsAdminEmails, getEvaluationAdminEmails, getOperationsAdminEmails } = require('../utils/adminRoleEmails');
const { sendTransactionalEmailSafe } = require('../services/emailService');
const { initiateBackgroundCheck } = require('../services/sterlingService');
const { createAuditLog, getRequestIp } = require('../services/auditService');
const { nextConsentId, nextPdfReference } = require('../services/documentNumberService');
const { candidateSubmissionConfirmation, wrapHtml, applicationStatusUpdate, websiteUrl } = require('../services/emailTemplateService');
const { generateDeclarationPdf } = require('../utils/declarationPdf');

const FRONTEND_BASE = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

const assertCandidate = (req, res) => {
  if (!req.user || req.user.role !== 'candidate') {
    res.status(403).json({ message: 'Candidate authentication required' });
    return false;
  }
  return true;
};

const candidateAdminLink = (candidateId) => `${FRONTEND_BASE}/admin/candidates/${candidateId}`;

const getStageFromPayment = (payment) => payment.stage || LEGACY_PAYMENT_TYPE_TO_STAGE[payment.type] || PAYMENT_STAGES.INITIAL_ONBOARDING_FEE;

const initiateSterlingVerification = async (req, res) => {
  try {
    if (!assertCandidate(req, res)) return;
    const candidate = await User.findById(req.user._id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (!candidate.admin1ProgressionApproved) {
      return res.status(403).json({ message: 'Verification initiation is available only after Admin 1 progression approval.' });
    }

    const payments = await Payment.find({ userId: candidate._id }).lean();
    const hasProgramPayment = payments.some(
      (p) => String(p.type || '').toLowerCase() === 'program' && ['pending', 'completed', 'verified', 'paid'].includes(String(p.status || '').toLowerCase())
    );
    if (!hasProgramPayment) {
      return res.status(403).json({ message: 'Verification initiation is available only after first installment payment is recorded.' });
    }

    const result = await initiateBackgroundCheck(candidate._id, { requestedBy: candidate.email });

    const paymentsAdmins = getPaymentsAdminEmails();
    const evaluationAdmins = getEvaluationAdminEmails();
    const recipients = [...new Set([...paymentsAdmins, ...evaluationAdmins])];
    const candidateName = candidate.name || candidate.email.split('@')[0];

    await sendTransactionalEmailSafe({
      to: recipients,
      subject: `NextStep Talent – Verification Process Initiated / ${candidateName}`,
      text: ['Verification initiated', `Candidate name: ${candidateName}`].join('\n'),
      html: wrapHtml({
        title: 'Verification Process Initiated',
        bodyHtml: `<p>Verification initiated</p><p><b>Candidate name:</b> ${candidateName}</p>`,
      }),
      fromEmail: 'noreply@nextsteptalent.net',
      fromName: 'NextStep Talent Team',
      templateKey: 'sterling_verification_initiated_admin_notice',
      relatedCandidateId: candidate._id,
    });

    await createAuditLog({
      req,
      actorType: 'candidate',
      actorId: String(candidate._id),
      actorRole: 'candidate',
      candidateId: candidate._id,
      action: 'candidate_sterling_initiated',
      previousValue: null,
      newValue: result,
      metadata: { requestedBy: candidate.email },
    });

    return res.status(201).json({ message: 'Verification initiated', result });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const submitCandidateApplication = async (req, res) => {
  try {
    if (!assertCandidate(req, res)) return;

    const candidate = await User.findById(req.user._id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const profile = await Profile.findOne({ userId: candidate._id }).sort({ createdAt: -1 }).lean();
    const now = new Date();

    candidate.applicationSubmittedAt = candidate.applicationSubmittedAt || now;
    candidate.evaluationStatus = 'submitted';
    candidate.status = candidate.status === 'account_created' ? 'profile_submitted' : candidate.status;
    await candidate.save();

    const paymentsAdmins = getPaymentsAdminEmails();
    const evaluationAdmins = getEvaluationAdminEmails();
    const submissionRecipients = [...new Set([...paymentsAdmins, ...evaluationAdmins])];

    const candidateName = candidate.name || candidate.email.split('@')[0];
    const candidateCountry = profile?.personalDetails?.currentCountryOfResidence || 'N/A';

    const adminLines = [
      `Candidate Name: ${candidateName}`,
      `Candidate Email: ${candidate.email}`,
      `Phone: ${candidate.phone || 'N/A'}`,
      `Country: ${candidateCountry}`,
      `Candidate ID: ${candidate.candidateId || String(candidate._id)}`,
      `Submission Timestamp: ${now.toISOString()}`,
      `Current Status: ${candidate.status}`,
      `Admin Review Link: ${candidateAdminLink(candidate._id)}`,
    ];

    await sendTransactionalEmailSafe({
      to: submissionRecipients,
      subject: `NextStep Talent Candidate Submission Received / ${candidateName}`,
      text: adminLines.join('\n'),
      html: wrapHtml({
        title: 'Candidate Submission Received',
        bodyHtml: `<p>A candidate submitted an application.</p><p>${adminLines.map((line) => {
          const [label, ...parts] = line.split(': ');
          return `<b>${label}:</b> ${parts.join(': ')}`;
        }).join('<br/>')}</p>`,
      }),
      templateKey: EMAIL_TEMPLATE_KEYS.CANDIDATE_SUBMISSION_ADMIN_NOTICE,
      relatedCandidateId: candidate._id,
    });

    const candidateMail = candidateSubmissionConfirmation({ candidateName });
    await sendTransactionalEmailSafe({
      to: candidate.email,
      ...candidateMail,
      templateKey: EMAIL_TEMPLATE_KEYS.CANDIDATE_SUBMISSION_CONFIRMATION,
      relatedCandidateId: candidate._id,
    });

    await createAuditLog({
      req,
      actorType: 'candidate',
      actorId: String(candidate._id),
      actorRole: 'candidate',
      candidateId: candidate._id,
      action: 'candidate_submission',
      previousValue: null,
      newValue: {
        submittedAt: now,
        status: candidate.status,
      },
      metadata: {
        candidateId: candidate.candidateId || '',
      },
    });

    return res.status(201).json({
      message: 'Application submission recorded and notifications dispatched',
      applicationSubmittedAt: candidate.applicationSubmittedAt,
      status: candidate.status,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCandidatePayments = async (req, res) => {
  try {
    if (!assertCandidate(req, res)) return;

    const [candidate, payments, invoices, receipts] = await Promise.all([
      User.findById(req.user._id).lean(),
      Payment.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Invoice.find({ candidateId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Receipt.find({ candidateId: req.user._id }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const receiptByPaymentId = new Map(receipts.map((r) => [String(r.paymentId), r]));
    const invoiceByStage = new Map();
    for (const invoice of invoices) {
      if (!invoiceByStage.has(invoice.paymentStage)) {
        invoiceByStage.set(invoice.paymentStage, invoice);
      }
    }

    const enrichedPayments = payments.map((payment) => {
      const stage = getStageFromPayment(payment);
      const receipt = payment.receiptId
        ? receipts.find((r) => String(r._id) === String(payment.receiptId))
        : receiptByPaymentId.get(String(payment._id));
      const invoice = payment.invoiceId
        ? invoices.find((i) => String(i._id) === String(payment.invoiceId))
        : invoiceByStage.get(stage);

      return {
        ...payment,
        stage,
        transactionReferenceId: payment.bankTransactionReference || payment.transactionId,
        verifiedAt: payment.verifiedAt || null,
        invoice: invoice
          ? {
              _id: invoice._id,
              invoiceNumber: invoice.invoiceNumber,
              paymentStage: invoice.paymentStage,
              pdfUrl: invoice.pdfUrl,
              paymentStatus: invoice.paymentStatus,
              issueDate: invoice.issueDate,
            }
          : null,
        receipt: receipt
          ? {
              _id: receipt._id,
              receiptNumber: receipt.receiptNumber,
              paymentStage: receipt.paymentStage,
              pdfUrl: receipt.pdfUrl,
              date: receipt.date,
            }
          : null,
      };
    });

    const stageSummary = [
      {
        stage: PAYMENT_STAGES.INITIAL_ONBOARDING_FEE,
        amount: 500,
        currency: 'USD',
        method: 'stripe',
        refundable: false,
        status: enrichedPayments.find((p) => getStageFromPayment(p) === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE && ['completed', 'paid', 'verified'].includes(String(p.status).toLowerCase())) ? 'paid' : 'pending',
      },
      {
        stage: PAYMENT_STAGES.FIRST_INSTALLMENT,
        amount: 3100,
        currency: 'USD',
        method: 'bank_transfer',
        refundable: 'conditional',
        status:
          enrichedPayments.find((p) => getStageFromPayment(p) === PAYMENT_STAGES.FIRST_INSTALLMENT)?.status ||
          (candidate.selectedStatus === 'selected' ? 'due' : 'pending'),
        refundInfo: {
          notSelectedAfterInterview: { deduction: 200, refundable: 2900 },
          selectedAndDeclined: { refundable: 0 },
        },
      },
      {
        stage: PAYMENT_STAGES.FINAL_PAYMENT,
        amount: 3100,
        currency: 'USD',
        method: 'bank_transfer',
        refundable: 'according_to_policy',
        status:
          enrichedPayments.find((p) => getStageFromPayment(p) === PAYMENT_STAGES.FINAL_PAYMENT)?.status ||
          (candidate.selectedStatus === 'selected' ? 'due' : 'pending'),
      },
    ];

    return res.json({
      backgroundCheckStatus: candidate.backgroundCheckStatus || 'not_started',
      paymentStages: stageSummary,
      payments: enrichedPayments,
      invoices,
      receipts,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const downloadCandidateInvoice = async (req, res) => {
  try {
    if (!assertCandidate(req, res)) return;
    const { invoiceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return res.status(400).json({ message: 'Invalid invoice id' });
    const invoice = await Invoice.findOne({ _id: invoiceId, candidateId: req.user._id }).lean();
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    if (invoice.pdfPath && path.isAbsolute(invoice.pdfPath)) {
      return res.download(invoice.pdfPath, `${invoice.invoiceNumber}.pdf`);
    }

    const relativePath = String(invoice.pdfUrl || '').trim();
    if (!relativePath.startsWith('/uploads/')) return res.status(404).json({ message: 'Invoice file path is unavailable' });

    const absolutePath = path.join(__dirname, '..', relativePath.replace('/uploads/', 'uploads/'));
    return res.download(absolutePath, `${invoice.invoiceNumber}.pdf`);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const downloadCandidateReceipt = async (req, res) => {
  try {
    if (!assertCandidate(req, res)) return;
    const { receiptId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(receiptId)) return res.status(400).json({ message: 'Invalid receipt id' });
    const receipt = await Receipt.findOne({ _id: receiptId, candidateId: req.user._id }).lean();
    if (!receipt) return res.status(404).json({ message: 'Receipt not found' });

    if (receipt.pdfPath && path.isAbsolute(receipt.pdfPath)) {
      return res.download(receipt.pdfPath, `${receipt.receiptNumber}.pdf`);
    }

    const relativePath = String(receipt.pdfUrl || '').trim();
    if (!relativePath.startsWith('/uploads/')) return res.status(404).json({ message: 'Receipt file path is unavailable' });

    const absolutePath = path.join(__dirname, '..', relativePath.replace('/uploads/', 'uploads/'));
    return res.download(absolutePath, `${receipt.receiptNumber}.pdf`);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const normalizeConsentDocuments = (body = {}) => {
  if (Array.isArray(body.documents) && body.documents.length) return body.documents;
  if (body.documentType) {
    return [{
      documentType: body.documentType,
      documentVersion: body.documentVersion,
      candidateTypedName: body.candidateTypedName,
      signature: body.signature,
      checkboxAcknowledged: body.checkboxAcknowledged,
      scrolledToEnd: body.scrolledToEnd,
    }];
  }
  return [];
};

const signCandidateConsents = async (req, res) => {
  try {
    if (!assertCandidate(req, res)) return;
    const candidate = await User.findById(req.user._id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const documents = normalizeConsentDocuments(req.body);
    if (!documents.length) {
      return res.status(400).json({ message: 'At least one consent document is required' });
    }

    const ipAddress = getRequestIp(req);
    const userAgent = String(req.headers['user-agent'] || '');
    const signedAt = new Date();

    const createdConsents = [];

    for (const doc of documents) {
      const documentType = String(doc.documentType || '').trim();
      const documentVersion = String(doc.documentVersion || '').trim();
      const checkboxAcknowledged = doc.checkboxAcknowledged === true;
      const scrolledToEnd = doc.scrolledToEnd === true;
      const typedName = String(doc.candidateTypedName || '').trim();
      const signature = doc.signature || {};

      if (!documentType || !documentVersion) {
        return res.status(400).json({ message: 'documentType and documentVersion are required for each consent' });
      }
      if (!checkboxAcknowledged) {
        return res.status(400).json({ message: `Consent checkbox must be acknowledged for ${documentType}` });
      }
      if (!scrolledToEnd) {
        return res.status(400).json({ message: `You must scroll to the end before signing ${documentType}` });
      }
      if (typedName.length < 3) {
        return res.status(400).json({ message: `Typed full legal name is required for ${documentType}` });
      }
      if (!String(signature.value || '').trim()) {
        return res.status(400).json({ message: `Signature is required for ${documentType}` });
      }

      const existing = await AgreementConsent.findOne({
        candidateId: candidate._id,
        documentType,
        documentVersion,
      }).lean();
      if (existing) {
        return res.status(409).json({ message: `Consent already exists for ${documentType} version ${documentVersion}` });
      }

      const consentId = await nextConsentId();
      const transactionId = `NST-TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const pdfReferenceNumber = await nextPdfReference('CONSENT');

      const consent = await AgreementConsent.create({
        candidateId: candidate._id,
        documentType,
        documentVersion,
        consentId,
        transactionId,
        candidateTypedName: typedName,
        drawnSignatureDataUrl: signature.type === 'drawn' ? String(signature.value || '') : '',
        checkboxAcknowledged,
        scrolledToEnd,
        signedAt,
        ipAddress,
        userAgent,
        pdfReferenceNumber,
      });

      const declarationAudit = {
        consentId,
        transactionId,
        pdfReference: pdfReferenceNumber,
        signedAt: signedAt.toISOString(),
        ipAddress,
        typedLegalName: typedName,
        signatureMethod: signature.type || 'typed',
        agreeChecked: checkboxAcknowledged,
        readCompleted: scrolledToEnd,
      };

      const pdfResult = await generateDeclarationPdf({ candidate, declarationAudit });

      consent.pdfUrl = pdfResult.fileUrl;
      consent.pdfPath = pdfResult.filePath;
      await consent.save();

      const textLines = [
        'Your legal consent has been recorded successfully.',
        `Consent ID: ${consentId}`,
        `Transaction ID: ${transactionId}`,
        `PDF Reference: ${pdfReferenceNumber}`,
        `Signed At: ${signedAt.toISOString()}`,
        `IP Address: ${ipAddress || 'N/A'}`,
      ];

      const emailResult = await sendTransactionalEmailSafe({
        to: candidate.email,
        subject: `Legal Consent Copy - ${documentType}`,
        text: textLines.join('\n'),
        html: wrapHtml({
          title: 'Legal Consent Copy',
          bodyHtml: `<p>Your legal consent has been recorded successfully.</p><p>${textLines.join('<br/>')}</p>`,
        }),
        attachments: [{
          filename: pdfResult.fileName,
          path: pdfResult.filePath,
        }],
        templateKey: EMAIL_TEMPLATE_KEYS.CONSENT_COPY,
        relatedCandidateId: candidate._id,
      });

      consent.emailedToCandidate = Boolean(emailResult.ok);
      consent.emailLogId = emailResult.log?._id || emailResult.error?.emailLogId || null;
      await consent.save();

      await createAuditLog({
        req,
        actorType: 'candidate',
        actorId: String(candidate._id),
        actorRole: 'candidate',
        candidateId: candidate._id,
        action: 'legal_document_consent_signed',
        previousValue: null,
        newValue: {
          documentType,
          documentVersion,
          consentId,
          transactionId,
          pdfReferenceNumber,
        },
        metadata: {
          checkboxAcknowledged,
          scrolledToEnd,
          signatureType: signature.type || 'typed',
        },
      });

      createdConsents.push(consent);
    }

    // Backward compatibility with current dashboard flow
    if (documents.some((doc) => String(doc.documentType).includes('declaration') || String(doc.documentType).includes('candidate_services'))) {
      candidate.status = 'declaration_signed';
      candidate.declarationConsent = {
        signedAt: signedAt.toISOString(),
        ipAddress,
        userAgent,
        consents: createdConsents.map((consent) => ({
          documentType: consent.documentType,
          documentVersion: consent.documentVersion,
          consentId: consent.consentId,
          transactionId: consent.transactionId,
          pdfReferenceNumber: consent.pdfReferenceNumber,
          pdfUrl: consent.pdfUrl,
        })),
      };
      await candidate.save();
    }

    return res.status(201).json({
      message: 'Consent(s) recorded successfully',
      consents: createdConsents,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const candidateInterviewEligible = (candidate) => {
  return (
    candidate?.operationsDecision === 'interview_required' &&
    candidate?.operationsStatus === 'completed' &&
    candidate?.backgroundCheckStatus === 'completed'
  );
};

const getInterviewSlots = async (req, res) => {
  try {
    if (!assertCandidate(req, res)) return;
    const candidate = await User.findById(req.user._id).lean();
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    if (!candidateInterviewEligible(candidate)) {
      return res.status(403).json({ message: 'Interview booking is available only after Operations approval and completed Sterling verification.' });
    }

    const slots = await InterviewSlot.find({ isBooked: false }).sort({ startTime: 1 }).lean();
    return res.json({
      eligible: true,
      slots,
      backgroundCheckStatus: candidate.backgroundCheckStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const bookInterviewSlot = async (req, res) => {
  try {
    if (!assertCandidate(req, res)) return;
    const candidate = await User.findById(req.user._id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    if (!candidateInterviewEligible(candidate)) {
      return res.status(403).json({ message: 'Interview booking is not available for your current status.' });
    }

    const slotId = String(req.body?.slotId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      return res.status(400).json({ message: 'Valid slotId is required' });
    }

    const slot = await InterviewSlot.findById(slotId);
    if (!slot) return res.status(404).json({ message: 'Interview slot not found' });
    if (slot.isBooked) return res.status(409).json({ message: 'Interview slot is already booked' });

    const booking = await InterviewBooking.create({
      candidateId: candidate._id,
      adminId: slot.adminId,
      slotId: slot._id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      timezone: slot.timezone,
      status: 'booked',
      meetingLink: String(req.body?.meetingLink || ''),
    });

    slot.isBooked = true;
    slot.bookedByCandidateId = candidate._id;
    await slot.save();

    candidate.interviewBookingId = booking._id;
    await candidate.save();

    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);

    const candidateMailLines = [
      `Interview Date/Time: ${start.toISOString()} to ${end.toISOString()}`,
      `Time Zone: ${booking.timezone}`,
      `Duration: 15 minutes`,
      booking.meetingLink ? `Meeting Link: ${booking.meetingLink}` : '',
      `Contact: contact@NextStepTalent.net`,
    ].filter(Boolean);

    await sendTransactionalEmailSafe({
      to: candidate.email,
      subject: 'NextStep Talent Interview Appointment Confirmed',
      text: candidateMailLines.join('\n'),
      html: wrapHtml({
        title: 'Interview Appointment Confirmed',
        bodyHtml: `<p>Your interview appointment is confirmed.</p><p>${candidateMailLines.join('<br/>')}</p>`,
      }),
      templateKey: EMAIL_TEMPLATE_KEYS.INTERVIEW_BOOKING_CONFIRMATION,
      relatedCandidateId: candidate._id,
    });

    const operationsAdmins = getOperationsAdminEmails();
    const paymentsAdmins = getPaymentsAdminEmails();
    const evaluationAdmins = getEvaluationAdminEmails();
    const interviewBookedRecipients = [...new Set([...operationsAdmins, ...paymentsAdmins, ...evaluationAdmins])];
    await sendTransactionalEmailSafe({
      to: interviewBookedRecipients,
      subject: `Interview Scheduled / ${candidate.name || candidate.email.split('@')[0]}`,
      text: [
        `Candidate Name: ${candidate.name || 'N/A'}`,
        `Selected Slot: ${start.toISOString()} to ${end.toISOString()}`,
        `Timezone: ${booking.timezone}`,
        `Meeting Link: ${booking.meetingLink || 'N/A'}`,
        `Candidate Email: ${candidate.email}`,
      ].join('\n'),
      html: wrapHtml({
        title: 'Interview Scheduled',
        bodyHtml: `<p><b>Candidate Name:</b> ${candidate.name || 'N/A'}<br/><b>Selected Slot:</b> ${start.toISOString()} to ${end.toISOString()}<br/><b>Timezone:</b> ${booking.timezone}<br/><b>Meeting Link:</b> ${booking.meetingLink || 'N/A'}<br/><b>Candidate Email:</b> ${candidate.email}</p>`,
      }),
      templateKey: 'internal_interview_booked_admin_loop',
      relatedCandidateId: candidate._id,
    });

    await createAuditLog({
      req,
      actorType: 'candidate',
      actorId: String(candidate._id),
      actorRole: 'candidate',
      candidateId: candidate._id,
      action: 'interview_booking_created',
      previousValue: null,
      newValue: {
        slotId: slot._id,
        bookingId: booking._id,
        startTime: booking.startTime,
        endTime: booking.endTime,
      },
      metadata: {
        timezone: booking.timezone,
        meetingLink: booking.meetingLink,
      },
    });

    return res.status(201).json({ booking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  submitCandidateApplication,
  initiateSterlingVerification,
  getCandidatePayments,
  downloadCandidateInvoice,
  downloadCandidateReceipt,
  signCandidateConsents,
  getInterviewSlots,
  bookInterviewSlot,
  candidateInterviewEligible,
};
