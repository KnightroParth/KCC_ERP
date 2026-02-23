const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');

// 1. Robust Environment Setup
// Resolve path to .env file relative to this script's location
const envPath = path.resolve(__dirname, '../../backend/.env'); 
// Try standard location if specific path fails, covering different execution contexts
require('dotenv').config({ path: fs.existsSync(envPath) ? envPath : path.resolve(__dirname, '../.env') });

if (!process.env.DATABASE) {
  console.error("❌ ERROR: DATABASE environment variable is missing. Check your .env file.");
  process.exit(1);
}

// 2. Import Models
// We need to require the model files so Mongoose registers the schemas
try {
    require('../src/models/appModels/Project');
    require('../src/models/appModels/Units');
} catch (e) {
    console.error("❌ Error importing models. Ensure paths are correct relative to script.", e);
    process.exit(1);
}

const Project = mongoose.model('Project');
const Unit = mongoose.model('Units'); // Note: Collection name inferred from previous context as 'Units'

// 3. Configuration
const PROJECTS = [
  {
    name: 'Lotus Park',
    filename: 'All flats data of all sites.xlsx - Lotus Park .csv',
    status: 'Execution',
    budget: 50000000,
    code: 'KCC-2025-001',
    startDate: '2024-01-01'
  },
  {
    name: 'Lotus Green',
    filename: 'All flats data of all sites.xlsx - Lotus Green.csv',
    status: 'Execution',
    budget: 45000000,
    code: 'KCC-2025-002',
    startDate: '2024-02-01'
  },
  {
    name: 'Lotus Height',
    filename: 'All flats data of all sites.xlsx - Lotus Height.csv',
    status: 'Planning',
    budget: 30000000,
    code: 'KCC-2025-003',
    startDate: '2024-03-01'
  }
];

// 4. Helpers
const cleanNumber = (val) => {
  if (!val) return 0;
  // Remove commas and non-numeric chars except dot
  return parseFloat(val.toString().replace(/[^0-9.]/g, '')) || 0;
};

const mapFloor = (val) => {
  if (!val) return 0;
  const v = val.toString().toLowerCase();
  if (v.includes('ground')) return 0;
  if (v.includes('first')) return 1;
  if (v.includes('second')) return 2;
  if (v.includes('third')) return 3;
  if (v.includes('fourth')) return 4;
  if (v.includes('fifth')) return 5;
  if (v.includes('sixth')) return 6;
  if (v.includes('seventh')) return 7;
  if (v.includes('eighth')) return 8;
  if (v.includes('ninth')) return 9;
  if (v.includes('tenth')) return 10;
  
  // Try parsing number
  const num = parseInt(v.replace(/[^0-9]/g, ''));
  return isNaN(num) ? v : num; // Return number if parsed, else original string
};

const getCol = (row, possibleNames) => {
  for (const name of possibleNames) {
    if (row[name] !== undefined) return row[name];
  }
  return null;
};

// 5. Main Execution Function
const runImport = async () => {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log("✅ Connected to MongoDB");

    // --- STEP A: CLEAN SLATE ---
    console.log("🧹 Clearing old data...");
    await Project.deleteMany({});
    await Unit.deleteMany({});
    console.log("✅ Database Wiped Successfully");

    let totalUnits = 0;

    // --- STEP B: PROCESS PROJECTS ---
    for (const pConfig of PROJECTS) {
      console.log(`\n🚀 Processing Project: ${pConfig.name}`);

      // 1. Create Project
      const project = await new Project({
        name: pConfig.name,
        projectId: pConfig.code,
        status: pConfig.status,
        totalBudget: pConfig.budget,
        plannedStartDate: new Date(pConfig.startDate),
        stakeholderName: 'KCC Infra',
        projectManagerId: 'admin'
      }).save();
      
      console.log(`   ✨ Created Project Doc (ID: ${project._id})`);

      // 2. Find CSV File
      // Look in root or backend folder
      let csvPath = path.resolve(__dirname, '../../', pConfig.filename);
      if (!fs.existsSync(csvPath)) {
        csvPath = path.resolve(__dirname, '../', pConfig.filename);
        if (!fs.existsSync(csvPath)) {
            // Fallback for file names with/without spaces if exact match fails
            console.warn(`   ⚠️  File not found at ${csvPath}. Skipping CSV import for this project.`);
            continue;
        }
      }

      // 3. Process CSV Rows
      const unitsToInsert = [];
      
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csv())
          .on('data', (row) => {
            // MAP FIELDS
            const unitNo = getCol(row, ['unit No', 'flat no.', 'Flat no', 'Flat No']);
            
            // Skip empty rows
            if (!unitNo) return;

            // Handle Missing Wing (Crucial for Lotus Height)
            // If column exists use it, otherwise default to "A"
            let wing = getCol(row, ['wing', 'Wing', 'Building']);
            if (!wing || wing.trim() === '') {
                wing = 'A'; 
            }

            const floor = mapFloor(getCol(row, ['Floor', 'floor']));
            const type = getCol(row, ['Type', 'type', 'Unit type', 'Unit Type']) || 'Standard';
            const area = cleanNumber(getCol(row, ['Rera Carpet Area in (Sq.mtr)', 'carpet area', '(RERA) Carpet area Sqm without balcony']));
            const buyer = getCol(row, ['Buyers Name', 'Buyers name', 'buyer']);

            // DETERMINE STATUS
            const status = (buyer && buyer.trim().length > 2) ? 'Sold' : 'Available';

            unitsToInsert.push({
              project: project._id,
              unitNumber: unitNo,
              towerOrWing: wing,
              floor: floor,
              unitType: type,
              carpetArea: area,
              status: status,
              ownerName: status === 'Sold' ? buyer : null
            });
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // 4. Batch Insert
      if (unitsToInsert.length > 0) {
        await Unit.insertMany(unitsToInsert);
        console.log(`   ✅ Imported ${unitsToInsert.length} units for ${pConfig.name}`);
        totalUnits += unitsToInsert.length;
      } else {
        console.log(`   ⚠️  No units found in file for ${pConfig.name}`);
      }
    }

    console.log(`\n🎉 IMPORT COMPLETE! Total Units: ${totalUnits}`);
    process.exit(0);

  } catch (err) {
    console.error("❌ Fatal Error:", err);
    process.exit(1);
  }
};

runImport();