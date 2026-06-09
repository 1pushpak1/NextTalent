const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const connectDB = require('./config/db');
const buildSwaggerSpec = require('./docs/swagger');

const authRoutes = require('./routes/authRoutes');
const eligibilityRoutes = require('./routes/eligibilityRoutes');
const profileRoutes = require('./routes/profileRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const documentRoutes = require('./routes/documentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const testimonialRoutes = require('./routes/testimonialRoutes');
const adminRoutes = require('./routes/adminRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const { stripeWebhook } = require('./controllers/paymentController');
const { serveStoredFile } = require('./utils/storage');

dotenv.config();

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
};

requireEnv('JWT_SECRET');

const app = express();
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(cors());
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.get(/^\/api\/files\/(.*)$/, serveStoredFile);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/candidate', candidateRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'NextStep Talent Backend',
    status: 'running',
    health: '/api/health',
  });
});

const preferredPort = Number(process.env.PORT) || 5000;
const swaggerSpec = buildSwaggerSpec(preferredPort);

app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const startServer = (portToUse) => {
  const server = app.listen(portToUse, () => {
    console.log(`Backend running on port ${portToUse}`);
    console.log(`Open: http://localhost:${portToUse}/api/health`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${portToUse} is already in use. Stop the other process or change PORT in backend/.env.`);
      process.exit(1);
    }
    console.error('Server startup error:', error.message);
    process.exit(1);
  });
};

const boot = async () => {
  await connectDB();
  startServer(preferredPort);
};

boot().catch((error) => {
  console.error('Startup failed:', error.message);
  process.exit(1);
});
