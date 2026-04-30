const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

dotenv.config();

const readArg = (flag) => {
  const hit = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : '';
};

const email = (readArg('--email') || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const password = readArg('--password') || process.env.ADMIN_PASSWORD || '';
const name = readArg('--name') || process.env.ADMIN_NAME || 'Admin User';

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is missing in environment');
  process.exit(1);
}

if (!email || !password) {
  console.error('Usage: node scripts/createAdmin.js --email=admin@example.com --password=StrongPass123 --name="Admin User"');
  console.error('Or set ADMIN_EMAIL and ADMIN_PASSWORD in environment.');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const passwordHash = await bcrypt.hash(password, 10);
    const update = {
      name,
      email,
      passwordHash,
      role: 'admin',
      emailVerified: true,
      phoneVerified: true,
      status: 'admin_active',
    };

    const user = await User.findOneAndUpdate(
      { email },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('Admin account ready:', {
      id: String(user._id),
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error('Failed to create admin:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

run();
