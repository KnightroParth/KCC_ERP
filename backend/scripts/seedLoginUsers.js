#!/usr/bin/env node
/**
 * Seed login users: role@kcc.com with password 1970.
 * Usage: node scripts/seedLoginUsers.js
 * Skips creating a user if that email already exists.
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
const envLocalPath = path.join(backendDir, '.env.local');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });
if (fs.existsSync(envLocalPath)) require('dotenv').config({ path: envLocalPath });

const Admin = require('../src/models/coreModels/Admin');
const AdminPassword = require('../src/models/coreModels/AdminPassword');

const PASSWORD = '1970';

// Only roles from roles and authority.xlsx: Master, Admin, PM, Planner/Site Incharge, Site Engineer, Store Incharge, Accounts
const USERS = [
  { role: 'master', name: 'KCC Master' },
  { role: 'admin', name: 'KCC Admin' },
  { role: 'pm', name: 'KCC PM' },
  { role: 'planner', name: 'KCC Planner' },
  { role: 'site_engineer', name: 'KCC Site Engineer' },
  { role: 'store_incharge', name: 'KCC Store Incharge' },
  { role: 'accounts', name: 'KCC Accounts' },
];

async function seed() {
  const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;
  if (!DATABASE) {
    console.error('DATABASE or MONGODB_URI not set in backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(DATABASE);
    console.log('Connected to MongoDB\n');

    for (const { role, name } of USERS) {
      const email = `${role}@kcc.com`;
      const existing = await Admin.findOne({ email, removed: false });
      if (existing) {
        console.log('Skip (exists):', email);
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const combined = salt + PASSWORD;
      const passwordHash = await bcrypt.hash(combined, 10);

      const newUser = await Admin.create({
        email,
        name,
        surname: '',
        role,
        enabled: true,
        removed: false,
      });

      await AdminPassword.create({
        user: newUser._id,
        salt,
        password: passwordHash,
        emailToken: '',
        resetToken: '',
        emailVerified: true,
        authType: 'email',
        loggedSessions: [],
      });

      console.log('Created:', email, '| role:', role);
    }

    console.log('\nDone. All logins use password: 1970');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    if (mongoose.connection.readyState === 1) await mongoose.connection.close();
    process.exit(1);
  }
}

seed();
