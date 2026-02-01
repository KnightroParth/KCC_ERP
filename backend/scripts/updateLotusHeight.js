const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const xlsx = require('xlsx');

// 1. Setup Environment
const envPath = path.resolve(__dirname, '../../backend/.env');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') });

if (!process.env.DATABASE) {
  console.error('❌ ERROR: DATABASE environment variable is missing. Check your .env file.');
  process.exit(1);
}

// 2. Import Models
try {
  require('../src/models/appModels/Project');
  require('../src/models/appModels/Units');
} catch (e) {
  console.error('❌ Error importing models:', e.message);
  process.exit(1);
}

const Project = mongoose.model('Project');
const Units = mongoose.model('Units');

// 3. Helper Functions
const parseFloor = (value) => {
  if (!value) return null;
  
  const str = value.toString().trim();
  const lower = str.toLowerCase();
  
  // Map ground floors to 0
  if (lower.includes('ground') || lower === 'lower ground' || lower === 'upper ground') {
    return 0;
  }
  
  // Map ordinal numbers
  const floorMap = {
    'first': 1,
    'second': 2,
    'third': 3,
    'fourth': 4,
    'fifth': 5,
    'sixth': 6,
    'seventh': 7,
    'eighth': 8,
    'ninth': 9,
    'tenth': 10
  };
  
  for (const [key, val] of Object.entries(floorMap)) {
    if (lower.includes(key)) {
      return val;
    }
  }
  
  // Try parsing as integer
  const num = parseInt(str.replace(/[^0-9-]/g, ''));
  return isNaN(num) ? null : num;
};

const parseCarpetArea = (value) => {
  if (!value) return null;
  
  // Remove commas and non-numeric characters except decimal point
  const cleaned = value.toString().replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? null : num;
};

const findColumn = (row, possibleNames) => {
  // First try exact matches
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
  }
  
  // Then try __EMPTY columns (Excel files with merged header cells)
  // Map common column positions to their likely names
  const emptyMap = {
    '__EMPTY': ['wing', 'Wing', 'WING'],
    '__EMPTY_1': ['unit No', 'unit No.', 'unit no', 'Unit No', 'Flat no.', 'Flat No', 'flat no', 'flat no.'],
    '__EMPTY_2': ['Floor', 'floor', 'FLOOR'],
    '__EMPTY_3': ['Type', 'type', 'Unit type', 'Unit Type'],
    '__EMPTY_6': ['Rera Carpet Area in (Sq.mtr)', 'RERA Carpet Area in (Sq.mtr)', 'Carpet Area', 'carpet area', 'Carpet area']
  };
  
  for (const [emptyKey, names] of Object.entries(emptyMap)) {
    if (row[emptyKey] !== undefined && row[emptyKey] !== null && row[emptyKey] !== '') {
      // Check if this __EMPTY column matches any of our target names
      for (const targetName of possibleNames) {
        if (names.includes(targetName)) {
          return row[emptyKey];
        }
      }
    }
  }
  
  return null;
};

// 4. Main Execution
const updateLotusHeight = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE);
    console.log('✅ Connected to MongoDB');

    // Find Lotus Height project
    const project = await Project.findOne({ name: 'Lotus Height' });
    if (!project) {
      console.error('❌ ERROR: Project "Lotus Height" not found in database');
      process.exit(1);
    }
    
    console.log(`✅ Found project: Lotus Height (ID: ${project._id})`);
    console.log(`   Project Code: ${project.projectCode || project.projectId || 'N/A'}`);

    // Find CSV/Excel file - try multiple possible file names
    const possibleFileNames = [
      'lotus height.xlsx',
      'Lotus Height.xlsx',
      'lotus height.csv',
      'Lotus Height.csv'
    ];
    
    let filePath = null;
    for (const fileName of possibleFileNames) {
      filePath = path.resolve(__dirname, '../../', fileName);
      if (fs.existsSync(filePath)) break;
      
      filePath = path.resolve(__dirname, '../', fileName);
      if (fs.existsSync(filePath)) break;
      
      filePath = null;
    }
    
    if (!filePath) {
      console.error(`❌ ERROR: File not found. Tried:`);
      possibleFileNames.forEach(name => {
        console.error(`   - ${name}`);
      });
      console.error(`   Searched in: ${path.resolve(__dirname, '../../')}`);
      console.error(`   Searched in: ${path.resolve(__dirname, '../')}`);
      process.exit(1);
    }
    
    console.log(`✅ Found file: ${filePath}`);

    // Read file (try Excel first, then CSV)
    let rows = [];
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.xlsx' || ext === '.xls') {
      // Read Excel file
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Use first sheet
      const sheet = workbook.Sheets[sheetName];
      
      // Read as array first to identify header row
      const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
      
      // Find the row that contains actual column headers (look for "unit No" or "wing")
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const row = rawData[i];
        const rowStr = row.join(' ').toLowerCase();
        if (rowStr.includes('unit no') || rowStr.includes('wing') || rowStr.includes('floor')) {
          headerRowIndex = i;
          break;
        }
      }
      
      // Get header row and map column indices
      const headerRow = rawData[headerRowIndex];
      const columnMap = {};
      headerRow.forEach((header, index) => {
        if (header) {
          const headerStr = header.toString().trim();
          columnMap[index] = headerStr;
        }
      });
      
      // Process data rows (starting after header row)
      rows = [];
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const rowArray = rawData[i];
        const rowObj = {};
        rowArray.forEach((value, index) => {
          if (columnMap[index]) {
            rowObj[columnMap[index]] = value;
          }
        });
        // Only add row if it has meaningful data
        if (Object.keys(rowObj).length > 0 && rowObj[Object.keys(rowObj)[0]]) {
          rows.push(rowObj);
        }
      }
      
      console.log(`✅ Read Excel file: ${rows.length} rows from sheet "${sheetName}" (using row ${headerRowIndex + 1} as headers)`);
    } else {
      // Read CSV file
      const csv = require('csv-parser');
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => rows.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
      console.log(`✅ Read CSV file: ${rows.length} rows`);
    }

    if (rows.length === 0) {
      console.error('❌ ERROR: No data found in file');
      process.exit(1);
    }

    // Debug: Show first row to see column names
    if (rows.length > 0) {
      console.log('\n📋 CSV Column names (first row):');
      console.log(Object.keys(rows[0]).join(', '));
      
      console.log('\n📋 Sample row data:');
      const sampleRow = rows[0];
      Object.keys(sampleRow).slice(0, 10).forEach(key => {
        console.log(`   ${key}: "${sampleRow[key]}"`);
      });
    }

    // Fetch all units for this project once (more efficient than individual queries)
    // Units store projectId as String (projectCode), not ObjectId
    // Try multiple variations to handle different data formats
    const projectCode = project.projectCode || project.projectId || project._id.toString();
    console.log(`   Searching for units with projectCode: ${projectCode}`);
    
    const allUnits = await Units.find({
      $or: [
        { projectId: projectCode }, // Standard: projectCode as string
        { projectId: project._id.toString() }, // Fallback: ObjectId as string
        { project: project._id }, // Legacy: project field as ObjectId
        { project: projectCode } // Legacy: project field as string
      ],
      removed: { $ne: true }
    }).lean();
    
    console.log(`✅ Found ${allUnits.length} existing units for Lotus Height`);
    
    // Debug: Show a sample unit if found
    if (allUnits.length > 0) {
      console.log(`   Sample unit projectId field: ${allUnits[0].projectId} (type: ${typeof allUnits[0].projectId})`);
    } else {
      // Check if any units exist at all
      const totalUnits = await Units.countDocuments({ removed: { $ne: true } });
      console.log(`   ⚠️  Total units in database: ${totalUnits}`);
      if (totalUnits > 0) {
        const sampleUnit = await Units.findOne({ removed: { $ne: true } }).lean();
        console.log(`   Sample unit projectId: ${sampleUnit?.projectId} (type: ${typeof sampleUnit?.projectId})`);
      }
    }

    // Create a map for quick lookup: key = "unitNumber|towerOrWing"
    const unitsMap = new Map();
    for (const unit of allUnits) {
      const key = `${unit.unitNumber}|${unit.towerOrWing || ''}`;
      unitsMap.set(key, unit);
    }
    
    // Debug: Show sample unit keys
    if (allUnits.length > 0) {
      console.log('\n📋 Sample unit keys from database (first 5):');
      allUnits.slice(0, 5).forEach(unit => {
        const key = `${unit.unitNumber}|${unit.towerOrWing || ''}`;
        console.log(`   "${key}" (unitNumber: "${unit.unitNumber}", towerOrWing: "${unit.towerOrWing || ''}")`);
      });
    }

    // Process rows and build bulk operations
    const bulkOps = [];
    const notFoundUnits = [];
    const processedKeys = new Set();

    for (const row of rows) {
      const unitNo = findColumn(row, ['unit No', 'unit No.', 'unit no', 'Unit No', 'Flat no.', 'Flat No', 'flat no', 'flat no.', 'Flat no']);
      const wing = findColumn(row, ['wing', 'Wing', 'WING', 'towerOrWing', 'Tower', 'tower']);
      const floorStr = findColumn(row, ['Floor', 'floor', 'FLOOR']);
      const carpetAreaStr = findColumn(row, ['Rera Carpet Area in (Sq.mtr)', 'RERA Carpet Area in (Sq.mtr)', 'Carpet Area', 'carpet area', 'Carpet area', '(RERA) Carpet area Sqm without balcony', 'RERA Carpet area Sqm without balcony']);

      // Skip if no unit number
      if (!unitNo) continue;

      const unitNoTrimmed = unitNo.toString().trim();
      const wingTrimmed = wing ? wing.toString().trim() : '';
      
      // If no wing found in CSV, try to extract from unit number (e.g., "LG -1" might have wing info)
      // Or try matching without wing if wing is empty
      
      // Debug first few rows
      if (bulkOps.length === 0 && notFoundUnits.length < 3) {
        console.log(`\n🔍 Processing row ${bulkOps.length + notFoundUnits.length + 1}:`);
        console.log(`   Raw unitNo: "${unitNo}" -> trimmed: "${unitNoTrimmed}"`);
        console.log(`   Raw wing: "${wing}" -> trimmed: "${wingTrimmed}"`);
        console.log(`   floorStr: "${floorStr}"`);
        console.log(`   carpetAreaStr: "${carpetAreaStr}"`);
      }

      // Parse values
      const floor = parseFloor(floorStr);
      const carpetArea = parseCarpetArea(carpetAreaStr);

      // Build update object
      // Store area as-is from CSV (no conversion)
      // Also set fields that frontend expects (floorNumber, areaSqft)
      const updateFields = {};
      if (floor !== null) {
        updateFields.floor = floor;
        // Frontend expects floorNumber (as number)
        updateFields.floorNumber = floor;
      }
      if (carpetArea !== null) {
        // Store carpet area as-is (no conversion)
        updateFields.carpetArea = carpetArea;
        // Also set saleableArea to same value (no conversion)
        updateFields.saleableArea = carpetArea;
        // Frontend expects areaSqft
        updateFields.areaSqft = carpetArea;
      }

      // Skip if nothing to update
      if (Object.keys(updateFields).length === 0) continue;

      // Look up unit in map
      let lookupKey = `${unitNoTrimmed}|${wingTrimmed}`;
      let unit = unitsMap.get(lookupKey);
      
      // If not found and no wing in CSV, try matching with all possible wings from database
      if (!unit && !wingTrimmed) {
        // Try to find unit by number only (check all wings)
        const matchingUnits = Array.from(unitsMap.entries()).filter(([key, u]) => 
          u.unitNumber === unitNoTrimmed
        );
        if (matchingUnits.length === 1) {
          unit = matchingUnits[0][1];
          lookupKey = matchingUnits[0][0];
          console.log(`   Found unit without wing: "${unitNoTrimmed}" -> "${lookupKey}"`);
        }
      }
      
      // If not found, try with different wing format (A-1 vs A1)
      if (!unit && wingTrimmed) {
        const altWing = wingTrimmed.replace('-', '');
        const altKey = `${unitNoTrimmed}|${altWing}`;
        unit = unitsMap.get(altKey);
        if (unit) {
          console.log(`   Found with alternative wing format: "${lookupKey}" -> "${altKey}"`);
        }
      }
      
      // Also try reverse (A1 vs A-1)
      if (!unit && wingTrimmed && !wingTrimmed.includes('-')) {
        const altWing = wingTrimmed.length === 2 ? `${wingTrimmed[0]}-${wingTrimmed[1]}` : null;
        if (altWing) {
          const altKey = `${unitNoTrimmed}|${altWing}`;
          unit = unitsMap.get(altKey);
          if (unit) {
            console.log(`   Found with alternative wing format: "${lookupKey}" -> "${altKey}"`);
          }
        }
      }
      
      // Debug: Log first few lookup attempts
      if (notFoundUnits.length < 5 && !unit) {
        console.log(`\n🔍 Debug lookup attempt ${notFoundUnits.length + 1}:`);
        console.log(`   CSV unitNo: "${unitNoTrimmed}", wing: "${wingTrimmed}"`);
        console.log(`   Lookup key: "${lookupKey}"`);
        console.log(`   Found in map: ${unit ? 'YES' : 'NO'}`);
        if (!unit) {
          // Try to find similar keys
          const similarKeys = Array.from(unitsMap.keys()).filter(k => 
            k.includes(unitNoTrimmed) || k.includes(wingTrimmed) || k.includes(wingTrimmed.replace('-', ''))
          ).slice(0, 5);
          if (similarKeys.length > 0) {
            console.log(`   Similar keys in map: ${similarKeys.join(', ')}`);
          } else {
            // Show exact matches for unit number
            const unitMatches = Array.from(unitsMap.keys()).filter(k => k.startsWith(unitNoTrimmed + '|')).slice(0, 3);
            if (unitMatches.length > 0) {
              console.log(`   Keys starting with "${unitNoTrimmed}|": ${unitMatches.join(', ')}`);
            }
          }
        }
      }
      
      if (unit) {
        // Avoid duplicate updates for same unit
        if (!processedKeys.has(unit._id.toString())) {
          bulkOps.push({
            updateOne: {
              filter: { _id: unit._id },
              update: { $set: updateFields }
            }
          });
          processedKeys.add(unit._id.toString());
        }
      } else {
        notFoundUnits.push({
          unitNo: unitNoTrimmed,
          wing: wingTrimmed || 'N/A'
        });
      }
    }

    // Execute bulk write
    if (bulkOps.length > 0) {
      const result = await Units.bulkWrite(bulkOps, { ordered: false });
      console.log(`\n✅ Matched and Updated ${result.modifiedCount} units (${bulkOps.length} operations)`);
      
      // Verify updates by checking a few units
      if (result.modifiedCount > 0) {
        console.log('\n🔍 Verifying updates (checking first 3 updated units):');
        const sampleKeys = Array.from(processedKeys).slice(0, 3);
        for (const unitId of sampleKeys) {
          const updatedUnit = await Units.findById(unitId).lean();
          if (updatedUnit) {
            console.log(`   Unit ${updatedUnit.unitNumber} (Wing: ${updatedUnit.towerOrWing}):`);
            console.log(`     - floor: ${updatedUnit.floor !== null && updatedUnit.floor !== undefined ? updatedUnit.floor : 'NOT SET'}`);
            console.log(`     - floorNumber: ${updatedUnit.floorNumber !== null && updatedUnit.floorNumber !== undefined ? updatedUnit.floorNumber : 'NOT SET'}`);
            console.log(`     - carpetArea: ${updatedUnit.carpetArea !== null && updatedUnit.carpetArea !== undefined ? updatedUnit.carpetArea : 'NOT SET'}`);
            console.log(`     - saleableArea: ${updatedUnit.saleableArea !== null && updatedUnit.saleableArea !== undefined ? updatedUnit.saleableArea : 'NOT SET'}`);
            console.log(`     - areaSqft: ${updatedUnit.areaSqft !== null && updatedUnit.areaSqft !== undefined ? updatedUnit.areaSqft : 'NOT SET'}`);
          }
        }
      }
    } else {
      console.log('\n⚠️  No units were updated');
    }

    // Log units not found
    if (notFoundUnits.length > 0) {
      console.log(`\n⚠️  ${notFoundUnits.length} units from CSV were not found in database:`);
      notFoundUnits.slice(0, 10).forEach(u => {
        console.log(`   - Unit: ${u.unitNo}, Wing: ${u.wing}`);
      });
      if (notFoundUnits.length > 10) {
        console.log(`   ... and ${notFoundUnits.length - 10} more`);
      }
    }

    console.log('\n✅ Update complete!');
    await mongoose.connection.close();
    process.exit(0);

  } catch (err) {
    console.error('❌ Fatal Error:', err);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
};

// Run the script
updateLotusHeight();
