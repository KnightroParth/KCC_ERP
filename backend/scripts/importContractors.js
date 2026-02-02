/**
 * Import Contractor List from Excel into Manage Vendor.
 * Usage: node scripts/importContractors.js [path-to-Contractor List.xlsx]
 * Defaults: phone=000000, email=abc@gmail.com, address=Akola
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const Vendor = require('../src/models/appModels/Vendor');

const DEFAULT_PHONE = '000000';
const DEFAULT_EMAIL = 'abc@gmail.com';
const DEFAULT_ADDRESS = 'Akola';

function findColumn(keys, ...candidates) {
  const lower = (s) => (s || '').toLowerCase().trim();
  for (const key of keys) {
    const k = lower(key);
    for (const c of candidates) {
      if (k === lower(c) || k.includes(lower(c))) return key;
    }
  }
  return null;
}

async function importData() {
  let filePath = process.argv[2];

  if (!filePath) {
    const localName = 'Contractor List.xlsx';
    const candidates = [
      path.join(__dirname, localName),
      path.join(__dirname, '..', localName),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Usage: node scripts/importContractors.js <path-to-Contractor List.xlsx>');
    console.error('Example: node scripts/importContractors.js "/path/to/Contractor List.xlsx"');
    process.exit(1);
  }

  const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;
  if (!DATABASE) {
    console.error('DATABASE or MONGODB_URI not set in backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(DATABASE);
    console.log('Connected to database.');

    console.log('Reading Excel:', filePath);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawData.length) {
      console.log('No rows in sheet.');
      process.exit(0);
    }

    const firstRowKeys = Object.keys(rawData[0]).filter((k) => k && String(k).trim());
    console.log('Columns found:', firstRowKeys);

    const nameColumn = findColumn(
      firstRowKeys,
      'contractor name',
      'contractor',
      'name',
      'party name',
      'vendor'
    );
    if (!nameColumn) {
      console.error('Could not find a name column. Expected: Contractor Name, Name, Contractor, etc.');
      process.exit(1);
    }

    const workTypeColumn = findColumn(
      firstRowKeys,
      'work type',
      'worktype',
      'type',
      'work'
    );

    const vendors = [];

    for (const row of rawData) {
      const rawName = row[nameColumn];
      if (rawName == null || String(rawName).trim() === '') continue;

      const name = String(rawName).trim();
      const workType = workTypeColumn && row[workTypeColumn] != null
        ? String(row[workTypeColumn]).trim()
        : '';

      vendors.push({
        name,
        phone: DEFAULT_PHONE,
        email: DEFAULT_EMAIL,
        address: DEFAULT_ADDRESS,
        workType: workType || undefined,
        enabled: true,
        removed: false,
      });
    }

    if (vendors.length === 0) {
      console.log('No valid contractor names to import.');
      process.exit(0);
    }

    console.log(`Importing ${vendors.length} vendors (phone=${DEFAULT_PHONE}, email=${DEFAULT_EMAIL}, address=${DEFAULT_ADDRESS})...`);

    const result = await Vendor.insertMany(vendors, { ordered: false });
    console.log('Imported', result.length, 'vendors successfully.');
  } catch (err) {
    if (err.code === 11000) {
      console.log('Some entries already existed (duplicates skipped).');
    } else if (err.writeErrors && err.writeErrors.length > 0) {
      const inserted = err.result?.insertedCount ?? err.insertedDocs?.length ?? 0;
      console.log('Import partially completed. Duplicates skipped. New vendors:', inserted);
    } else {
      console.error('Error:', err.message);
      process.exit(1);
    }
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

importData();
