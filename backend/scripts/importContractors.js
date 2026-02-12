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

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Get all rows as arrays to find the header row
    const allRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    let headerRowIndex = -1;
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      const hasName = row.some(cell => {
        const c = String(cell).toLowerCase().trim();
        return c === 'contractor name' || c === 'name' || c === 'party name';
      });
      if (hasName) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.error('Could not find header row with "Contractor Name", "Name", or "Party Name"');
      process.exit(1);
    }

    console.log('Found header row at index:', headerRowIndex);
    const headerRow = allRows[headerRowIndex];
    const dataRows = allRows.slice(headerRowIndex + 1);

    const findColIndex = (...candidates) => {
      const lower = (s) => String(s || '').toLowerCase().trim();
      for (const c of candidates) {
        const index = headerRow.findIndex(h => lower(h) === lower(c));
        if (index !== -1) return index;
      }
      for (const c of candidates) {
        const index = headerRow.findIndex(h => lower(h).includes(lower(c)));
        if (index !== -1) return index;
      }
      return -1;
    };

    const nameColIdx = findColIndex('contractor name', 'name', 'party name', 'contractor', 'vendor');
    const phoneColIdx = findColIndex('contact number', 'phone', 'contact', 'mobile');
    const workTypeColIdx = findColIndex('category of work', 'work type', 'worktype', 'type', 'work');

    if (nameColIdx === -1) {
      console.error('Could not find a name column in the header row:', headerRow);
      process.exit(1);
    }

    const vendors = [];

    for (const rowArr of dataRows) {
      const rawName = rowArr[nameColIdx];
      if (rawName == null || String(rawName).trim() === '' || String(rawName).toLowerCase() === 'null') continue;
      if (String(rawName).trim().toLowerCase() === 'contractor name') continue; // Skip header duplicate if any

      const name = String(rawName).trim();
      const phone = phoneColIdx !== -1 && rowArr[phoneColIdx] ? String(rowArr[phoneColIdx]).trim() : DEFAULT_PHONE;
      const workType = workTypeColIdx !== -1 && rowArr[workTypeColIdx] ? String(rowArr[workTypeColIdx]).trim() : '';

      vendors.push({
        name,
        phone: phone && phone !== 'null' ? phone : DEFAULT_PHONE,
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
