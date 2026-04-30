const Payment = require('../models/Payment');
const User = require('../models/User');
const Profile = require('../models/Profile');
const sendEmail = require('../utils/sendEmail');
const Stripe = require('stripe');

const amountByType = {
  initial: 500,
  program: 3500,
  final: 4000,
};

const statusByType = {
  initial: 'initial_payment_complete',
  program: 'program_payment_complete',
  final: 'final_payment_complete',
};

const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const saveCompletedPayment = async (session, fallback = {}) => {
  const metadata = session.metadata || {};
  const userId = metadata.userId || fallback.userId;
  const type = metadata.type || fallback.type;
  const method = metadata.method || fallback.method || 'card';

  if (!userId || !type || !amountByType[type]) {
    throw new Error('Missing payment metadata in checkout session');
  }

  const transactionId = session.payment_intent || session.id;
  const existing = await Payment.findOne({ transactionId });
  if (existing) return existing;

  const amount = typeof session.amount_total === 'number' ? session.amount_total / 100 : amountByType[type];

  const payment = await Payment.create({
    userId,
    type,
    amount,
    currency: (session.currency || 'usd').toUpperCase(),
    method,
    status: 'completed',
    transactionId,
  });

  await User.findByIdAndUpdate(userId, { status: statusByType[type] });
  const user = await User.findById(userId);
  if (user?.email) {
    await sendEmail({
      to: user.email,
      subject: 'Payment Confirmation - NextStep Talent',
      text: `Your ${type} payment of USD ${amountByType[type]} has been received.`,
    });
  }

  return payment;
};

const createPaymentIntent = async (req, res) => {
  try {
    const stripe = getStripeClient();
    const { type, method = 'card' } = req.body;
    if (!amountByType[type]) {
      return res.status(400).json({ message: 'Invalid payment type' });
    }

    const [profile, payments, user] = await Promise.all([
      Profile.findOne({ userId: req.user._id }).sort({ createdAt: -1 }),
      Payment.find({ userId: req.user._id }),
      User.findById(req.user._id),
    ]);
    const hasInitial = payments.some((p) => p.type === 'initial' && p.status === 'completed');
    const hasProgram = payments.some((p) => p.type === 'program' && p.status === 'completed');

    if (type === 'initial' && profile?.status !== 'accepted') {
      return res.status(403).json({ message: 'Initial payment is available only after internal evaluation acceptance' });
    }

    if (type === 'program') {
      if (!hasInitial) {
        return res.status(403).json({ message: 'Complete initial payment first' });
      }
      if (!['documents_received', 'program_payment_complete', 'selected', 'final_payment_complete'].includes(user?.status || '')) {
        return res.status(403).json({ message: 'Program payment opens only after all documents are confirmed by team' });
      }
      if (hasProgram) {
        return res.status(400).json({ message: 'Program payment already completed' });
      }
    }

    if (type === 'final' && user?.status !== 'selected') {
      return res.status(403).json({ message: 'Final payment is available only after selection result is marked selected' });
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
            unit_amount: amountByType[type] * 100,
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
      amount: amountByType[type],
      currency: 'USD',
      method,
      provider: 'stripe_checkout',
    });
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
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createPaymentIntent, confirmPayment, getMyPayments, stripeWebhook };
