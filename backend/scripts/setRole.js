#!/usr/bin/env node
/**
 * Set an Admin user's role by email.
 * Usage: node scripts/setRole.js <email> <role>
 * Example: node scripts/setRole.js admin@kcc.com site_engineer
 *
 * Valid roles: master, admin, pm, planner, site_engineer, store_incharge, accounts (from roles and authority.xlsx)
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Load .env from backend directory
const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
const envLocalPath = path.join(backendDir, '.env.local');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });
if (fs.existsSync(envLocalPath)) require('dotenv').config({ path: envLocalPath });

const Admin = require('../src/models/coreModels/Admin');

// Only roles from roles and authority.xlsx
const VALID_ROLES = ['master', 'admin', 'pm', 'planner', 'site_engineer', 'store_incharge', 'accounts'];

async function setRole() {
  const email = process.argv[2];
  const role = process.argv[3];

  if (!email || !role) {
    console.error('Usage: node scripts/setRole.js <email> <role>');
    console.error('Example: node scripts/setRole.js admin@kcc.com site_engineer');
    console.error('Valid roles:', VALID_ROLES.join(', '));
    process.exit(1);
  }

  const roleLower = role.toLowerCase().trim();
  if (!VALID_ROLES.includes(roleLower)) {
    console.error('Invalid role. Valid roles:', VALID_ROLES.join(', '));
    process.exit(1);
  }

  const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;
  if (!DATABASE) {
    console.error('DATABASE or MONGODB_URI not set in backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(DATABASE);
    const user = await Admin.findOne({ email: email.trim().toLowerCase(), removed: false });
    if (!user) {
      console.error('No user found with email:', email);
      await mongoose.connection.close();
      process.exit(1);
    }
    user.role = roleLower;
    await user.save();
    console.log('OK: Updated', user.email, 'role to', roleLower);
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    if (mongoose.connection.readyState === 1) await mongoose.connection.close();
    process.exit(1);
  }
}

setRole();
