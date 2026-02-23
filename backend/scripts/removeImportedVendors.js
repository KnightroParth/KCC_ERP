/**
 * Remove vendors that were imported by importContractors.js
 * (phone=000000, email=abc@gmail.com, address=Akola).
 * Run this before re-running the import to avoid duplicates.
 *
 * Usage: node scripts/removeImportedVendors.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const Vendor = require('../src/models/appModels/Vendor');

const IMPORT_PHONE = '000000';
const IMPORT_EMAIL = 'abc@gmail.com';
const IMPORT_ADDRESS = 'Akola';

async function removeImported() {
  const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;
  if (!DATABASE) {
    console.error('DATABASE or MONGODB_URI not set in backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(DATABASE);
    console.log('Connected to database.');

    const result = await Vendor.deleteMany({
      phone: IMPORT_PHONE,
      email: IMPORT_EMAIL,
      address: IMPORT_ADDRESS,
    });

    console.log('Removed', result.deletedCount, 'imported vendor(s).');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

removeImported();
