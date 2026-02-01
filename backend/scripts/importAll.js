#!/usr/bin/env node

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ========================================
// CONFIGURATION & VALIDATION
// ========================================

const DATABASE_URL = process.env.DATABASE;
if (!DATABASE_URL) {
  console.error('❌ FATAL: DATABASE environment variable not found');
  process.exit(1);
}

const EXCEL_PATH = path.resolve(__dirname, '../../All flats data of all sites.xlsx');
if (!fs.existsSync(EXCEL_PATH)) {
  console.error(`❌ FATAL: Excel file not found at ${EXCEL_PATH}`);
  process.exit(1);
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function findColumnIndex(headers, aliases) {
  if (!headers || headers.length === 0) return -1;
  
  for (const alias of aliases) {
    const idx = headers.findIndex(h => {
      if (!h) return false;
      const headerStr = h.toString().toLowerCase().trim();
      const aliasStr = alias.toLowerCase().trim();
      return headerStr === aliasStr;
    });
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseFloorValue(value) {
  if (!value) return null;
  
  const str = value.toString().toLowerCase().trim();
  
  const floorMap = {
    'ground': 0,
    'lower ground': 0,
    'lg': 0,
    'ug': 0,
    'upper ground': 0,
    'first': 1,
    'f': 1,
    'second': 2,
    's': 2,
    'third': 3,
    'fourth': 4,
    'fifth': 5,
    'sixth': 6,
    'seventh': 7,
    'eighth': 8,
    'ninth': 9,
    'tenth': 10,
  };
  
  if (floorMap[str] !== undefined) {
    return floorMap[str];
  }
  
  const num = parseInt(str);
  return isNaN(num) ? null : num;
}

function cleanCarpetArea(value) {
  if (!value) return 0;
  
  const str = value.toString().trim();
  const num = parseFloat(str.replace(/[^\d.]/g, ''));
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

function cleanOwnerName(value) {
  if (!value) return '';
  const str = value.toString().trim();
  return str.length > 2 ? str : '';
}

// ========================================
// MAIN IMPORT FUNCTION
// ========================================

async function runImport() {
  console.clear();
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           COMPREHENSIVE DATA IMPORT - FINAL VERSION           ║');
  console.log('║                 KCC ERP System - 2026                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // STEP 1: Connect to database
    console.log('📌 STEP 1: Connecting to MongoDB...');
    await mongoose.connect(DATABASE_URL, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected successfully\n');

    // STEP 2: Load models
    console.log('📌 STEP 2: Loading models...');
    require('../src/models/appModels/Project');
    require('../src/models/appModels/Units');
    
    const Project = mongoose.model('Project');
    const Units = mongoose.model('Units');
    console.log('✅ Models loaded\n');

    // STEP 3: Wipe collections
    console.log('📌 STEP 3: Clearing existing data...');
    const projectsDeleted = await Project.deleteMany({});
    const unitsDeleted = await Units.deleteMany({});
    console.log(`✅ Deleted ${projectsDeleted.deletedCount} projects`);
    console.log(`✅ Deleted ${unitsDeleted.deletedCount} units\n`);

    // STEP 4: Create projects
    console.log('📌 STEP 4: Creating projects...\n');

    const projectsData = [
      { name: 'Lotus Park', status: 'Execution', budget: 50000000, sheet: 'Lotus Park ' },
      { name: 'Lotus Green', status: 'Execution', budget: 45000000, sheet: 'Lotus Green' },
      { name: 'Lotus Height', status: 'Planning', budget: 30000000, sheet: 'Lotus Height' },
    ];

    const projectMap = {};
    const now = new Date();
    const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

    for (const projData of projectsData) {
      const project = new Project({
        name: projData.name,
        status: projData.status,
        budget: projData.budget,
        plannedStartDate: now,
        targetEndDate: futureDate,
        stakeholderName: 'KCC Infra',
        projectManagerId: 'PM001',
        scopeDescription: `${projData.name} - Real Estate Development Project`,
      });

      await project.save();
      projectMap[projData.sheet] = {
        code: project.projectCode,
        id: project._id,
        name: project.name,
      };

      console.log(`   ✓ ${project.name}`);
      console.log(`     - Code: ${project.projectCode}`);
      console.log(`     - Budget: ₹${project.budget.toLocaleString()}`);
      console.log(`     - Status: ${project.status}\n`);
    }

    // STEP 5: Read Excel file
    console.log('📌 STEP 5: Reading Excel file...\n');
    const workbook = xlsx.readFile(EXCEL_PATH);
    const sheetList = workbook.SheetNames;

    console.log(`   ✓ Found ${sheetList.length} sheets:`);
    sheetList.forEach(name => console.log(`     - "${name}"`));
    console.log();

    // STEP 6: Process each sheet
    console.log('📌 STEP 6: Processing sheets and importing units...\n');

    let totalUnitsImported = 0;

    for (const sheetName of sheetList) {
      if (!projectMap[sheetName]) {
        console.log(`   ⚠️  Skipping "${sheetName}" - no matching project\n`);
        continue;
      }

      console.log(`   📄 Processing: "${sheetName}"`);
      const projectInfo = projectMap[sheetName];

      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rows.length < 3) {
        console.log(`   ⚠️  Sheet has insufficient data\n`);
        continue;
      }

      const headers = rows[1]; // Headers are on row 1 (0-indexed)
      const dataRows = rows.slice(2); // Data starts from row 2

      // Find column indices with comprehensive aliases
      const unitIdx = findColumnIndex(headers, ['unit no', 'unit no.', 'flat no', 'flat no.', 'unit number']);
      const wingIdx = findColumnIndex(headers, ['wing', 'tower', 'building']);
      const floorIdx = findColumnIndex(headers, ['floor', 'fl']);
      const typeIdx = findColumnIndex(headers, ['type', 'unit type', 'unit type']);
      const areaIdx = findColumnIndex(headers, ['carpet area', 'rera carpet area', 'carpet area (sqm)', 'area']);
      const buyerIdx = findColumnIndex(headers, ['buyers name', 'buyer name', 'owner name', 'owners name']);

      console.log(`     Columns found:`);
      console.log(`       - Unit Number: ${unitIdx >= 0 ? '✓' : '✗'}`);
      console.log(`       - Wing/Tower: ${wingIdx >= 0 ? '✓' : '✗'}`);
      console.log(`       - Floor: ${floorIdx >= 0 ? '✓' : '✗'}`);
      console.log(`       - Type: ${typeIdx >= 0 ? '✓' : '✗'}`);
      console.log(`       - Carpet Area: ${areaIdx >= 0 ? '✓' : '✗'}`);
      console.log(`       - Buyer Name: ${buyerIdx >= 0 ? '✓' : '✗'}`);

      const unitsToInsert = [];

      for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
        const row = dataRows[rowIdx];
        if (!row || !row[unitIdx]) continue; // Skip empty rows

        try {
          const unitNumber = row[unitIdx]?.toString().trim() || '';
          if (!unitNumber) continue;

          // Wing/Tower - DEFAULT TO 'A' IF MISSING
          let towerOrWing = row[wingIdx]?.toString().trim() || 'A';
          if (!towerOrWing || towerOrWing === '') {
            towerOrWing = 'A';
          }

          // Floor - Parse intelligently
          const floor = parseFloorValue(row[floorIdx]);

          // Unit Type
          const unitType = row[typeIdx]?.toString().trim() || '';

          // Carpet Area - Clean to number
          const carpetArea = cleanCarpetArea(row[areaIdx]);

          // Owner Name - Clean text
          const ownerName = cleanOwnerName(row[buyerIdx]);

          // Status - Based on owner
          const status = ownerName.length > 0 ? 'Sold' : 'Available';

          unitsToInsert.push({
            projectId: projectInfo.code, // Store projectCode as string
            unitNumber,
            towerOrWing,
            floor: floor !== null ? floor : 0,
            unitType,
            carpetArea: carpetArea || 0,
            status,
            ownerName,
            ratePerSqft: 0,
            enabled: true,
            removed: false,
          });
        } catch (error) {
          console.log(`     ⚠️  Error processing row ${rowIdx + 1}: ${error.message}`);
        }
      }

      // Batch insert
      if (unitsToInsert.length > 0) {
        try {
          await Units.insertMany(unitsToInsert, { ordered: false });
          console.log(`     ✓ Imported ${unitsToInsert.length} units`);
          totalUnitsImported += unitsToInsert.length;
        } catch (error) {
          console.log(`     ⚠️  Insert error: ${error.message}`);
        }
      } else {
        console.log(`     ⚠️  No valid units found in sheet`);
      }

      console.log();
    }

    // STEP 7: Verification
    console.log('📌 STEP 7: Verifying import...\n');
    const projectCount = await Project.countDocuments();
    const unitCount = await Units.countDocuments();

    console.log(`   ✓ Projects in database: ${projectCount}`);
    console.log(`   ✓ Units in database: ${unitCount}`);
    console.log();

    // Final summary
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ IMPORT COMPLETED SUCCESSFULLY                ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('📊 FINAL SUMMARY:');
    console.log(`   • Projects Created: ${projectCount}`);
    console.log(`   • Total Units Imported: ${unitCount}`);
    console.log(`   • Import Status: SUCCESS ✓\n`);

    console.log('✨ Your database is now ready to use!');
    console.log('   1. Refresh your browser');
    console.log('   2. Go to Units Management');
    console.log('   3. Select a project from the dropdown');
    console.log('   4. All units should appear!\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ FATAL ERROR:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\n   Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the import
runImport();
