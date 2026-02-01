require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const path = require('path');
const xlsx = require('xlsx');

const Supplier = require('../src/models/appModels/Supplier');

mongoose.connect(process.env.DATABASE);
mongoose.Promise = global.Promise;

const fileName = 'Supplier Data of KCC.xlsx';
const filePath = path.join(__dirname, fileName);

async function importData() {
  try {
    console.log('🔄 Connecting to Database...');
    console.log(`📖 Reading Excel file: ${fileName}...`);

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; 
    const sheet = workbook.Sheets[sheetName];

    // Read raw data
    const rawData = xlsx.utils.sheet_to_json(sheet);
    
    if (rawData.length === 0) {
        console.log('❌ Excel file appears empty.');
        process.exit();
    }

    console.log(`🔍 Found ${rawData.length} rows.`);

    // --- DEBUG: Print Headers found in the first row ---
    const firstRowKeys = Object.keys(rawData[0]);
    console.log('📋 Excel Headers Found:', firstRowKeys);

    // --- SMART COLUMN FINDER ---
    // Find a column that looks like "Name" or "Supplier"
    const nameColumn = firstRowKeys.find(key => {
        const k = key.toLowerCase().trim();
        return k === 'supplier name' || k === 'supplier' || k === 'name' || k.includes('party');
    });

    if (!nameColumn) {
        console.log('❌ Could not identify a "Name" or "Supplier" column automatically.');
        console.log('👉 Please rename your Excel column to "Name" and try again.');
        process.exit();
    }

    console.log(`✅ Using column "${nameColumn}" for Supplier Name.`);

    const suppliersToImport = [];

    for (const row of rawData) {
      const rawName = row[nameColumn];

      if (rawName) {
        const cleanName = String(rawName).trim();
        if (cleanName) {
            suppliersToImport.push({
              name: cleanName,
              phone: '0000000000', // Placeholder
              email: '',
              enabled: true,
              removed: false,
              notes: 'Imported via Script'
            });
        }
      }
    }

    if (suppliersToImport.length === 0) {
      console.log('❌ No valid data found in the identified column.');
      process.exit();
    }

    console.log(`📦 Importing ${suppliersToImport.length} suppliers...`);

    // Insert into DB
    await Supplier.insertMany(suppliersToImport, { ordered: false })
      .then(() => console.log('✅ Success! Suppliers imported.'))
      .catch((err) => {
          if (err.code === 11000) {
              console.log('⚠️ Some duplicates were skipped (Data already exists).');
              console.log('✅ Import completed successfully.');
          } else {
              console.error('❌ Database Error:', err);
          }
      });

    process.exit();

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    process.exit(1);
  }
}

importData();