#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const EmailLog = require('../models/EmailLog');

const run = async () => {
  await connectDB();
  const email = process.argv[2] || 'kumawatharsh2004@gmail.com';
  const logs = await EmailLog.find({ to: email }).sort({ createdAt: -1 }).limit(10).lean();
  console.log('Found logs:', logs.length);
  logs.forEach((l) => console.log(JSON.stringify(l, null, 2)));
  process.exit(0);
};
run();
