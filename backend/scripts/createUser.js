#!/usr/bin/env node
/**
 * Create an Admin user with email, password, name, and role.
 * Usage: node scripts/createUser.js <email> <password> <name> <role>
 * Example: node scripts/createUser.js site@kcc.com pass123 "Site Eng Name" site_engineer
 *
 * Valid roles: master, admin, pm, planner, site_engineer, store_incharge, accounts (from roles and authority.xlsx)
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

// Only roles from roles and authority.xlsx
const VALID_ROLES = ['master', 'admin', 'pm', 'planner', 'site_engineer', 'store_incharge', 'accounts'];

async function createUser() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4];
  const role = process.argv[5];

  if (!email || !password || !name || !role) {
    console.error('Usage: node scripts/createUser.js <email> <password> <name> <role>');
    console.error('Example: node scripts/createUser.js site@kcc.com pass123 "Site Eng Name" site_engineer');
    console.error('Valid roles:', VALID_ROLES.join(', '));
    process.exit(1);
  }

  const roleLower = role.toLowerCase().trim();
  if (!VALID_ROLES.includes(roleLower)) {
    console.error('Invalid role. Allowed roles:', VALID_ROLES.join(', '));
    process.exit(1);
  }

  const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;
  if (!DATABASE) {
    console.error('DATABASE or MONGODB_URI not set in backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(DATABASE);
    const existingUser = await Admin.findOne({ email: email.trim().toLowerCase(), removed: false });
    if (existingUser) {
      console.error('User with this email already exists.');
      await mongoose.connection.close();
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const combined = salt + password;
    const passwordHash = await bcrypt.hash(combined, 10);

    const newUser = new Admin({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      surname: '',
      role: roleLower,
      enabled: true,
      removed: false,
    });
    const savedUser = await newUser.save();

    const newPassword = new AdminPassword({
      user: savedUser._id,
      salt,
      password: passwordHash,
      emailToken: '',
      resetToken: '',
      emailVerified: true,
      authType: 'email',
      loggedSessions: [],
    });
    await newPassword.save();

    console.log('Successfully created user:', savedUser.email, 'role:', roleLower);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    if (mongoose.connection.readyState === 1) await mongoose.connection.close();
    process.exit(1);
  }
}

createUser();
