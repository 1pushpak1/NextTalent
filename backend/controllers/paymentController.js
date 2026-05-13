const Payment = require('../models/Payment');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Document = require('../models/Document');
const { sendStepUpdateEmail } = require('../utils/stepEmailer');
const { getProgramFeeBreakdown } = require('../utils/programFee');
const {
  generateInitialPaymentReceiptPdf,
  generateProgramPaymentReceiptPdf,
  generateFinalPaymentReceiptPdf,
} = require('../utils/paymentReceiptPdf');
const { generateStage1InvoicePdf, generateStage2InvoicePdf } = require('../utils/invoicePdf');
const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const amountByType = {
  initial: 500,
  final: 3100,
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
    if (existing.type === 'initial' && !existing.receiptUrl) {
      const [candidate, profile] = await Promise.all([
        User.findById(existing.userId).lean(),
        Profile.findOne({ userId: existing.userId }).sort({ createdAt: -1 }).lean(),
      ]);
      const { receiptUrl } = await generateInitialPaymentReceiptPdf({
        payment: existing,
        candidate,
        profile,
      });
      existing.receiptUrl = receiptUrl;
      await existing.save();
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
    type,
    amount,
    currency: (session.currency || 'usd').toUpperCase(),
    method,
    status: 'completed',
    transactionId,
  });

  if (type === 'initial') {
    const [candidate, profile] = await Promise.all([
      User.findById(userId).lean(),
      Profile.findOne({ userId }).sort({ createdAt: -1 }).lean(),
    ]);
    const { receiptUrl } = await generateInitialPaymentReceiptPdf({
      payment,
      candidate,
      profile,
    });
    payment.receiptUrl = receiptUrl;
    await payment.save();
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

    const profile = await Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

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
      receiptUrl: `/uploads/payment-receipts/${req.file.filename}`,
    });

    if (type === 'program' || type === 'final') {
      const { receiptUrl } = type === 'program'
        ? await generateProgramPaymentReceiptPdf({
            payment,
            candidate: user,
            profile,
          })
        : await generateFinalPaymentReceiptPdf({
            payment,
            candidate: user,
            profile,
          });
      payment.receiptUrl = receiptUrl;
      await payment.save();
    }

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
      ['initial', 'program', 'final'].includes(String(payment.type || '').toLowerCase())
    );

    if (paymentsToRefreshReceipt.length) {
      const [candidate, profile] = await Promise.all([
        User.findById(req.user._id).lean(),
        Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      ]);

      await Promise.all(
        paymentsToRefreshReceipt.map(async (payment) => {
          const normalizedType = String(payment.type || '').toLowerCase();
          const generator =
            normalizedType === 'initial'
              ? generateInitialPaymentReceiptPdf
              : normalizedType === 'program'
                ? generateProgramPaymentReceiptPdf
                : generateFinalPaymentReceiptPdf;
          const { receiptUrl } = await generator({ payment, candidate, profile });
          payment.receiptUrl = receiptUrl;
          await payment.save();
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
    const [candidate, profile, payments] = await Promise.all([
      User.findById(req.user._id).lean(),
      Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: req.user._id }).lean(),
    ]);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const hasInitialPayment = payments.some((p) => p.type === 'initial' && p.status === 'completed');
    if (!hasInitialPayment) {
      return res.status(403).json({ message: 'Stage 1 invoice is available after initial payment completion.' });
    }

    const invoice = await generateStage1InvoicePdf({ candidate, profile });
    return res.json({
      ...invoice,
      candidateId: String(candidate._id),
      issueDate: new Date().toISOString(),
      amountDue: 3100,
      currency: 'USD',
      paymentStatus: 'DUE',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getStage2Invoice = async (req, res) => {
  try {
    const [candidate, profile, payments] = await Promise.all([
      User.findById(req.user._id).lean(),
      Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ userId: req.user._id }).lean(),
    ]);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const hasProgramPayment = payments.some((p) => p.type === 'program' && ['pending', 'completed'].includes(String(p.status || '').toLowerCase()));
    if (!hasProgramPayment) {
      return res.status(403).json({ message: 'Stage 2 invoice is available after first installment submission.' });
    }

    const invoice = await generateStage2InvoicePdf({ candidate, profile });
    return res.json({
      ...invoice,
      candidateId: String(candidate._id),
      issueDate: new Date().toISOString(),
      amountReceived: 3100,
      amountDue: 3100,
      currency: 'USD',
      paymentStatus: 'FINAL PAYMENT DUE',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { createPaymentIntent, confirmPayment, submitBankTransferPayment, getMyPayments, getStage1Invoice, getStage2Invoice, stripeWebhook, uploadReceipt };
