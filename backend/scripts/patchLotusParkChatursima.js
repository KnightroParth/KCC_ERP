/**
 * Patch Lotus Park units with Construction Unit Type and Chatursima from Excel.
 *
 * File: Lotus Park flat and duplex data.xlsx — Sheet 1 has all contents.
 * - Skip first 2 rows; headers are on row 3.
 * - Headers: sr. No., wing, unit No, Floor, Unit Type, Construction Unit Type,
 *   East , West, North, South, Buyers name
 *   (Note: "East " may have a trailing space in the source.)
 *
 * Match: projectId = Lotus Park projectCode, towerOrWing = wing, unitNumber = unit No
 * Update: $set constructionUnitType, chatursima.{east,west,north,south}
 *
 * Run from repo root:
 *   node backend/scripts/patchLotusParkChatursima.js [path/to/file.xlsx]
 * Default: Lotus Park flat and duplex data.xlsx (in project root, backend/, or backend/scripts/)
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const xlsx = require('xlsx');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DATABASE) {
  console.error('❌ ERROR: DATABASE environment variable is missing. Check your .env file.');
  process.exit(1);
}

// Load models
require('../src/models/appModels/Project');
require('../src/models/appModels/Units');

const Project = mongoose.model('Project');
const Units = mongoose.model('Units');

const DEFAULT_FILE_NAME = 'Lotus Park flat and duplex data.xlsx';
const HEADER_ROW_INDEX = 2; // Row 3 (0-based index 2)

function resolveFilePath() {
  const passed = process.argv[2];
  if (passed) {
    const p = path.isAbsolute(passed) ? passed : path.resolve(process.cwd(), passed);
    if (fs.existsSync(p)) return p;
    console.error(`❌ File not found: ${p}`);
    process.exit(1);
  }
  const candidates = [
    path.resolve(__dirname, '..', DEFAULT_FILE_NAME),
    path.resolve(__dirname, DEFAULT_FILE_NAME),
    path.resolve(process.cwd(), DEFAULT_FILE_NAME),
    path.resolve(process.cwd(), 'backend', DEFAULT_FILE_NAME),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  console.error(`❌ File not found. Tried:\n   ${candidates.join('\n   ')}`);
  console.error(`   Usage: node patchLotusParkChatursima.js [path/to/Lotus Park flat and duplex data.xlsx]`);
  process.exit(1);
}

/** Read Excel Sheet 1; skip first 2 rows, row 3 is header. Returns array of row objects. */
function readExcelSheet1SkipTwoRows(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Sheet 1
  const sheet = workbook.Sheets[sheetName];
  const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

  if (rawData.length <= HEADER_ROW_INDEX) {
    throw new Error('Sheet has fewer than 3 rows (need 2 skip + header + data).');
  }

  const headerRow = rawData[HEADER_ROW_INDEX];
  const columnMap = {};
  headerRow.forEach((cell, index) => {
    if (cell != null && String(cell).trim() !== '') {
      columnMap[index] = String(cell).trim();
    }
  });

  const rows = [];
  for (let i = HEADER_ROW_INDEX + 1; i < rawData.length; i++) {
    const rowArray = rawData[i];
    const rowObj = {};
    rowArray.forEach((value, index) => {
      if (columnMap[index]) {
        const v = value == null ? '' : value;
        rowObj[columnMap[index]] = typeof v === 'number' ? String(v) : String(v).trim();
      }
    });
    if (Object.keys(rowObj).length > 0) {
      rows.push(rowObj);
    }
  }
  return rows;
}

async function run() {
  const filePath = resolveFilePath();
  console.log('✅ Using file:', filePath);
  console.log('✅ Sheet: Sheet 1 (first sheet)');

  await mongoose.connect(process.env.DATABASE);
  console.log('✅ Connected to MongoDB');

  const project = await Project.findOne({ name: 'Lotus Park' });
  if (!project) {
    console.error('❌ Project "Lotus Park" not found.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const projectCode = project.projectCode || project.projectId || project._id.toString();
  console.log(`✅ Lotus Park projectCode: ${projectCode}`);

  const rows = readExcelSheet1SkipTwoRows(filePath);
  console.log(`✅ Read ${rows.length} data rows (header on row 3).`);

  if (rows.length > 0) {
    console.log('📋 Column names:', Object.keys(rows[0]).join(', '));
  }

  const allUnits = await Units.find({
    projectId: projectCode,
    removed: { $ne: true },
  }).lean();

  const key = (u) => `${(u.unitNumber || '').toString().trim()}|${(u.towerOrWing || u.buildingName || '').toString().trim()}`;
  const unitsMap = new Map();
  allUnits.forEach((u) => unitsMap.set(key(u), u));
  console.log(`✅ Loaded ${allUnits.length} Lotus Park units from DB.`);

  let matched = 0;
  let updated = 0;
  const notFound = [];

  for (const row of rows) {
    const wing = (row['wing'] != null ? row['wing'] : row['Wing'] || '').toString().trim();
    const unitNo = (row['unit No'] != null ? row['unit No'] : row['unit No.'] || '').toString().trim();
    if (!unitNo) continue;

    const lookupKey = `${unitNo}|${wing}`;
    const unit = unitsMap.get(lookupKey);
    if (!unit) {
      notFound.push({ unitNo, wing });
      continue;
    }
    matched += 1;

    const constructionUnitType = (row['Construction Unit Type'] != null ? row['Construction Unit Type'] : '').toString().trim() || undefined;
    const east = (row['East '] != null ? row['East '] : row['East'] != null ? row['East'] : '').toString().trim() || undefined;
    const west = (row['West'] != null ? row['West'] : '').toString().trim() || undefined;
    const north = (row['North'] != null ? row['North'] : '').toString().trim() || undefined;
    const south = (row['South'] != null ? row['South'] : '').toString().trim() || undefined;

    const updateDoc = {};
    if (constructionUnitType) updateDoc.constructionUnitType = constructionUnitType;
    const hasChatursima = east || west || north || south;
    if (hasChatursima) {
      updateDoc.chatursima = {
        east: east || '',
        west: west || '',
        north: north || '',
        south: south || '',
      };
    }

    if (Object.keys(updateDoc).length === 0) continue;

    const result = await Units.updateOne(
      { _id: unit._id },
      { $set: updateDoc }
    );
    if (result.modifiedCount > 0) updated += 1;
  }

  console.log('\n--- Summary ---');
  console.log(`Matched in DB: ${matched}`);
  console.log(`Updated:       ${updated}`);
  console.log(`Not found:     ${notFound.length}`);
  if (notFound.length > 0) {
    console.log('\n⚠️  Sample not found (unit No | wing):');
    notFound.slice(0, 10).forEach(({ unitNo, wing }) => console.log(`   ${unitNo} | ${wing}`));
    if (notFound.length > 10) console.log(`   ... and ${notFound.length - 10} more.`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
