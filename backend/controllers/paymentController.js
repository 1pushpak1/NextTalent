const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Document = require('../models/Document');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { sendTransactionalEmailSafe } = require('../services/emailService');
const { wrapHtml } = require('../services/emailTemplateService');
const { getPaymentsAdminEmails, getEvaluationAdminEmails } = require('../utils/adminRoleEmails');
const { getProgramFeeBreakdown } = require('../utils/programFee');
const {
  generateInvoiceForStage,
  generateReceiptForPayment,
  buildReceiptEmailForPayment,
} = require('../services/billingPdfService');
const { PAYMENT_STAGES, LEGACY_PAYMENT_TYPE_TO_STAGE, EMAIL_TEMPLATE_KEYS, PAYMENT_STAGE_CONFIG } = require('../constants/workflow');
const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const amountByType = {
  initial: Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.INITIAL_ONBOARDING_FEE].amount || 0),
  final: Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0),
};

const statusByType = {
  initial: 'initial_payment_complete',
  program: 'program_payment_complete',
  final: 'final_payment_complete',
};

const paymentReceiptUploadDir = path.join(__dirname, '..', 'uploads', 'payment-receipts');
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(paymentReceiptUploadDir, { recursive: true });
    cb(null, paymentReceiptUploadDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const getDefaultAmountForType = (type) => {
  if (type === 'program') return getProgramFeeBreakdown(null).total;
  return amountByType[type];
};
const isProgressionApproved = (user) => Boolean(user?.admin1ProgressionApproved);

const getTemplateKeyForStage = (stage) => {
  if (stage === PAYMENT_STAGES.INITIAL_ONBOARDING_FEE) return EMAIL_TEMPLATE_KEYS.RECEIPT_INITIAL;
  if (stage === PAYMENT_STAGES.FIRST_INSTALLMENT) return EMAIL_TEMPLATE_KEYS.RECEIPT_FIRST;
  return EMAIL_TEMPLATE_KEYS.RECEIPT_FINAL;
};

const buildPdfAttachment = (document, numberField) => {
  if (!document?.pdfPath || !fs.existsSync(document.pdfPath)) return null;
  return {
    filename: `${document[numberField] || document._id}.pdf`,
    path: document.pdfPath,
    contentType: 'application/pdf',
  };
};

const ensureReceiptForPayment = async ({ payment, candidate, stage }) => {
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

const sendReceiptEmail = async ({ candidate, payment, receipt, stage, invoice = null }) => {
  const receiptMail = await buildReceiptEmailForPayment({ candidate, payment, receipt, stage, invoice });
  const attachments = [
    buildPdfAttachment(receipt, 'receiptNumber'),
    invoice ? buildPdfAttachment(invoice, 'invoiceNumber') : null,
  ].filter(Boolean);

  return sendTransactionalEmailSafe({
    to: candidate.email,
    ...receiptMail,
    templateKey: getTemplateKeyForStage(stage),
    attachments,
    relatedCandidateId: candidate._id,
  });
};

const saveCompletedPayment = async (session, fallback = {}) => {
  const metadata = session.metadata || {};
  const userId = metadata.userId || fallback.userId;
  const type = metadata.type || fallback.type;
  const method = metadata.method || fallback.method || 'card';

  if (!userId || !type || !getDefaultAmountForType(type)) {
    throw new Error('Missing payment metadata in checkout session');
  }

  const transactionId = session.payment_intent || session.id;
  const existing = await Payment.findOne({ transactionId });
  if (existing) {
    if (existing.type === 'initial' && !existing.receiptId) {
      const candidate = await User.findById(existing.userId);
      if (candidate) {
        const receipt = await ensureReceiptForPayment({
          payment: existing,
          candidate,
          stage: PAYMENT_STAGES.INITIAL_ONBOARDING_FEE,
        });
        await sendReceiptEmail({
          candidate,
          payment: existing,
          receipt,
          stage: PAYMENT_STAGES.INITIAL_ONBOARDING_FEE,
        });
      }
    }
    return existing;
  }

  let amount = typeof session.amount_total === 'number' ? session.amount_total / 100 : getDefaultAmountForType(type);
  if (type === 'program' && typeof session.amount_total !== 'number') {
    const profile = await Profile.findOne({ userId }).sort({ createdAt: -1 }).lean();
    amount = getProgramFeeBreakdown(profile).total;
  }

  const payment = await Payment.create({
    userId,
    candidateId: userId,
    type,
    stage: LEGACY_PAYMENT_TYPE_TO_STAGE[type],
    amount,
    currency: (session.currency || 'usd').toUpperCase(),
    method,
    status: 'completed',
    transactionId,
  });

  if (type === 'initial') {
    payment.nonRefundableAmount = Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.INITIAL_ONBOARDING_FEE].amount || 0);
    payment.refundableAmount = 0;
    payment.refundStatus = 'non_refundable';

    const candidate = await User.findById(userId);
    if (candidate) {
      const receipt = await ensureReceiptForPayment({
        payment,
        candidate,
        stage: PAYMENT_STAGES.INITIAL_ONBOARDING_FEE,
      });
      await sendReceiptEmail({
        candidate,
        payment,
        receipt,
        stage: PAYMENT_STAGES.INITIAL_ONBOARDING_FEE,
      });
    }
  }

  await User.findByIdAndUpdate(userId, { status: statusByType[type] });
  const user = await User.findById(userId);
  const nextUrl =
    type === 'initial'
      ? `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/declaration`
      : type === 'program'
        ? `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/candidate-dashboard`
        : `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/candidate-dashboard`;
  await sendStepUpdateEmail({
    to: user?.email,
    candidateName: user?.name || user?.email?.split('@')[0],
    stepKey: type === 'initial' ? 'initial_payment' : type === 'program' ? 'program_payment' : 'final_payment',
    heading: 'Payment received successfully',
    message:
      type === 'initial'
        ? 'Your initial payment has been received successfully. Please complete the next onboarding and documentation steps from your dashboard.'
        : type === 'program'
          ? 'Your payment has been received successfully. Please continue with the next dashboard steps while your process moves forward.'
          : 'Your final payment has been received successfully. Please continue with the next dashboard steps.',
    status: 'completed',
    details: [
      { label: 'Payment Type', value: type },
      { label: 'Amount', value: `USD ${amount}` },
      { label: 'Transaction ID', value: transactionId },
    ],
    cta: { label: 'Open Next Step', url: nextUrl },
  });

  return payment;
};

const createPaymentIntent = async (req, res) => {
  try {
    const stripe = getStripeClient();
    const { type, method = 'card' } = req.body;
    if (!getDefaultAmountForType(type)) {
      return res.status(400).json({ message: 'Invalid payment type' });
    }
    if (type !== 'initial') {
      return res.status(400).json({ message: 'Use bank transfer flow for program and final payments' });
    }

    const [profile, user] = await Promise.all([
      Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 }),
      User.findById(req.user._id).lean(),
    ]);

    if (!isProgressionApproved(user)) {
      return res.status(403).json({ message: 'Payment access will unlock only after Admin 1 progression approval.' });
    }

    if (type === 'initial' && profile?.status !== 'accepted') {
      return res.status(403).json({ message: 'Initial payment is available only after internal evaluation acceptance' });
    }

    const appUrl = req.body.returnBaseUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${appUrl}/payment-success?type=${type}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelPath = type === 'initial' ? '/initial-payment' : type === 'program' ? '/payment/program-fee' : '/payment/final-payment';
    const cancelUrl = `${appUrl}${cancelPath}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: req.user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: getDefaultAmountForType(type) * 100,
            product_data: {
              name: `NextStep Talent - ${type.charAt(0).toUpperCase() + type.slice(1)} Payment`,
            },
          },
        },
      ],
      metadata: {
        userId: String(req.user._id),
        type,
        method,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({
      sessionId: session.id,
      checkoutUrl: session.url,
      amount: getDefaultAmountForType(type),
      currency: 'USD',
      method,
      provider: 'stripe_checkout',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitBankTransferPayment = async (req, res) => {
  try {
    const { type, bankReference = '' } = req.body || {};
    if (!['program', 'final'].includes(type)) {
      return res.status(400).json({ message: 'Bank transfer is supported only for program or final payment' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Transfer receipt file is required' });
    }

    const [payments, user, docs, profile] = await Promise.all([
      Payment.find({ userId: req.user._id }),
      User.findById(req.user._id),
      Document.find({ userId: req.user._id }),
      Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
    ]);
    if (!isProgressionApproved(user)) {
      return res.status(403).json({ message: 'Payment access will unlock only after Admin 1 progression approval.' });
    }
    const hasInitial = payments.some((p) => p.type === 'initial' && p.status === 'completed');
    const hasProgramCompleted = payments.some((p) => p.type === 'program' && p.status === 'completed');
    const hasFinalCompleted = payments.some((p) => p.type === 'final' && p.status === 'completed');
    const docsUploaded = docs.length > 0;

    if (type === 'program') {
      if (!hasInitial) return res.status(403).json({ message: 'Complete initial payment first' });
      if (!docsUploaded) return res.status(403).json({ message: 'Upload documents before program payment' });
      if (hasProgramCompleted) return res.status(400).json({ message: 'Program payment already completed' });
    }

    if (type === 'final') {
      if (user?.status !== 'selected') return res.status(403).json({ message: 'Final payment is available only after selection' });
      if (hasFinalCompleted) return res.status(400).json({ message: 'Final payment already completed' });
    }

    const programFeeBreakdown = type === 'program' ? getProgramFeeBreakdown(profile) : null;
    const paymentAmount = type === 'program' ? programFeeBreakdown.total : amountByType[type];

    const payment = await Payment.create({
      userId: req.user._id,
      type,
      amount: paymentAmount,
      currency: 'USD',
      method: 'bank_transfer',
      status: 'pending',
      transactionId: `BANK-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      bankReference: String(bankReference || '').trim(),
      bankTransactionReference: String(bankReference || '').trim(),
      stage: LEGACY_PAYMENT_TYPE_TO_STAGE[type],
      receiptUrl: `/uploads/payment-receipts/${req.file.filename}`,
    });

    // Bank-transfer receipts are generated only after admin verification.

    await sendStepUpdateEmail({
      to: req.user?.email,
      candidateName: req.user?.name || req.user?.email?.split('@')[0],
      stepKey: type === 'program' ? 'program_payment' : 'final_payment',
      heading: 'Payment receipt uploaded',
      message: type === 'program'
        ? `Your USD ${paymentAmount} payment receipt has been uploaded successfully and is now pending admin approval.`
        : 'Your payment receipt has been uploaded successfully and is now pending admin approval.',
      status: 'pending',
      details: [
        { label: 'Payment Type', value: type },
        { label: 'Amount', value: `USD ${paymentAmount}` },
        ...(type === 'program'
          ? [
              { label: 'Program Fee', value: `USD ${programFeeBreakdown.baseProgramFee}` },
              { label: 'Background Verification', value: `USD ${programFeeBreakdown.backgroundVerificationFee}` },
              { label: 'India Compliance Surcharge', value: `USD ${programFeeBreakdown.indiaComplianceSurcharge}` },
            ]
          : []),
        { label: 'Reference', value: String(bankReference || '—') },
      ],
      cta: { label: 'View Payment History', url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/payment-history` },
    });

    if (type === 'program') {
      const adminRecipients = [...new Set([...getPaymentsAdminEmails(), ...getEvaluationAdminEmails()])];
      const candidateName = user?.name || user?.email?.split('@')?.[0] || 'Candidate';
      const frontendBaseUrl = String(process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
      const adminCandidateUrl = `${frontendBaseUrl}/admin/candidates/${String(user?._id || '')}`;

      await sendTransactionalEmailSafe({
        to: adminRecipients,
        subject: `NextStep Talent Program Fee Receipt Submitted / ${candidateName}`,
        text: [
          'A candidate submitted Program Fee receipt for admin review.',
          `Candidate Name: ${candidateName}`,
          `Candidate Email: ${user?.email || 'N/A'}`,
          `Candidate ID: ${user?.candidateId || String(user?._id || '')}`,
          `Amount: USD ${paymentAmount}`,
          `Payment Type: Program Fee (First Installment)`,
          `Bank Reference: ${String(bankReference || 'N/A')}`,
          `Submitted At: ${new Date(payment.createdAt || Date.now()).toISOString()}`,
          `Review Link: ${adminCandidateUrl}`,
        ].join('\n'),
        html: wrapHtml({
          title: 'Program Fee Receipt Submitted',
          bodyHtml: `<p>A candidate submitted Program Fee receipt for admin review.</p>
<p><b>Candidate Name:</b> ${candidateName}<br/>
<b>Candidate Email:</b> ${user?.email || 'N/A'}<br/>
<b>Candidate ID:</b> ${user?.candidateId || String(user?._id || '')}<br/>
<b>Amount:</b> USD ${paymentAmount}<br/>
<b>Payment Type:</b> Program Fee (First Installment)<br/>
<b>Bank Reference:</b> ${String(bankReference || 'N/A')}<br/>
<b>Submitted At:</b> ${new Date(payment.createdAt || Date.now()).toISOString()}<br/>
<b>Review Link:</b> <a href="${adminCandidateUrl}">${adminCandidateUrl}</a></p>`,
        }),
        templateKey: 'program_fee_receipt_submitted_admin_review',
        relatedCandidateId: user?._id || null,
        relatedAdminActionId: String(payment._id || ''),
      });
    }

    res.status(201).json({ message: 'Receipt uploaded. Awaiting admin verification.', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const stripe = getStripeClient();
    const { sessionId, type, method = 'card' } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Payment is not completed yet' });
    }

    const payment = await saveCompletedPayment(session, {
      userId: String(req.user._id),
      type,
      method,
    });

    res.status(201).json({ message: 'Payment confirmed', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const stripeWebhook = async (req, res) => {
  try {
    const stripe = getStripeClient();
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_ENDPOINT_SECRET;

    if (!webhookSecret) {
      return res.status(400).json({ message: 'Webhook secret not configured' });
    }

    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    if (event.type === 'checkout.session.completed') {
      await saveCompletedPayment(event.data.object);
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const paymentsToRefreshReceipt = payments.filter((payment) =>
      ['initial', 'program', 'final'].includes(String(payment.type || '').toLowerCase()) &&
      ['completed', 'verified', 'paid'].includes(String(payment.status || '').toLowerCase())
    );

    if (paymentsToRefreshReceipt.length) {
      const candidate = await User.findById(req.user._id);

      await Promise.all(
        paymentsToRefreshReceipt.map(async (payment) => {
          const normalizedType = String(payment.type || '').toLowerCase();
          const stage = LEGACY_PAYMENT_TYPE_TO_STAGE[normalizedType] || payment.stage;
          if (!candidate || !stage) return;

          if (payment.receiptId) {
            const receipt = await Receipt.findById(payment.receiptId);
            if (receipt?.pdfUrl && payment.receiptUrl !== receipt.pdfUrl) {
              payment.receiptUrl = receipt.pdfUrl;
              await payment.save();
            }
            return;
          }

          if (normalizedType === 'initial') {
            await ensureReceiptForPayment({ payment, candidate, stage });
          }
        })
      );
    }

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStage1Invoice = async (req, res) => {
  try {
    const [candidate, payments] = await Promise.all([
      User.findById(req.user._id).lean(),
      Payment.find({ userId: req.user._id }).lean(),
    ]);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    if (!isProgressionApproved(candidate)) {
      return res.status(403).json({ message: 'Invoice access will unlock only after Admin 1 progression approval.' });
    }

    const hasInitialPayment = payments.some((p) => p.type === 'initial' && p.status === 'completed');
    if (!hasInitialPayment) {
      return res.status(403).json({ message: 'Stage 1 invoice is available after initial payment completion.' });
    }

    let persistedInvoice = await Invoice.findOne({ candidateId: candidate._id, paymentStage: PAYMENT_STAGES.FIRST_INSTALLMENT })
      .sort({ createdAt: -1 })
      .lean();

    const invoice = persistedInvoice || await generateInvoiceForStage({
      candidate,
      stage: PAYMENT_STAGES.FIRST_INSTALLMENT,
    });
    if (!persistedInvoice) {
      await User.findByIdAndUpdate(candidate._id, { $addToSet: { invoices: invoice._id } });
    }

    return res.json({
      invoiceNumber: invoice.invoiceNumber,
      invoiceUrl: invoice.pdfUrl,
      invoiceId: invoice._id,
      pdfReferenceNumber: invoice.pdfReferenceNumber,
      candidateId: String(candidate._id),
      issueDate: new Date().toISOString(),
      amountDue: Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FIRST_INSTALLMENT].amount || 0),
      currency: 'USD',
      paymentStatus: 'DUE',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getStage2Invoice = async (req, res) => {
  try {
    const [candidate, payments] = await Promise.all([
      User.findById(req.user._id).lean(),
      Payment.find({ userId: req.user._id }).lean(),
    ]);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    if (!isProgressionApproved(candidate)) {
      return res.status(403).json({ message: 'Invoice access will unlock only after Admin 1 progression approval.' });
    }

    const hasProgramPayment = payments.some((p) => p.type === 'program' && ['pending', 'completed', 'verified', 'paid'].includes(String(p.status || '').toLowerCase()));
    if (!hasProgramPayment) {
      return res.status(403).json({ message: 'Stage 2 invoice is available after first installment submission.' });
    }

    let persistedInvoice = await Invoice.findOne({ candidateId: candidate._id, paymentStage: PAYMENT_STAGES.FINAL_PAYMENT })
      .sort({ createdAt: -1 })
      .lean();
    const invoice = persistedInvoice || await generateInvoiceForStage({
      candidate,
      stage: PAYMENT_STAGES.FINAL_PAYMENT,
      amountReceived: Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0),
    });
    if (!persistedInvoice) {
      await User.findByIdAndUpdate(candidate._id, { $addToSet: { invoices: invoice._id } });
    }

    return res.json({
      invoiceNumber: invoice.invoiceNumber,
      invoiceUrl: invoice.pdfUrl,
      invoiceId: invoice._id,
      pdfReferenceNumber: invoice.pdfReferenceNumber,
      candidateId: String(candidate._id),
      issueDate: new Date().toISOString(),
      amountReceived: Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0),
      amountDue: Number(PAYMENT_STAGE_CONFIG[PAYMENT_STAGES.FINAL_PAYMENT].amount || 0),
      currency: 'USD',
      paymentStatus: 'FINAL PAYMENT DUE',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { createPaymentIntent, confirmPayment, submitBankTransferPayment, getMyPayments, getStage1Invoice, getStage2Invoice, stripeWebhook, uploadReceipt };
