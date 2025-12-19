// backend/scripts/importMaterials.js
// Script to bulk import materials from Excel/CSV file

require('module-alias/register');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Load models
const Material = require('../src/models/appModels/Material');

// Category normalization mapping
const normalizeCategory = (category) => {
  if (!category) return 'Other';
  
  const cat = category.toLowerCase().trim();
  
  // Normalize common variations
  if (cat.includes('electric') || cat.includes('electrical')) {
    return 'Electrical';
  }
  if (cat.includes('plumb') || cat.includes('plumber')) {
    return 'Plumbing';
  }
  if (cat.includes('civil') || cat.includes('construction')) {
    return 'Civil';
  }
  if (cat.includes('steel') || cat.includes('iron')) {
    return 'Steel';
  }
  if (cat.includes('cement') || cat.includes('concrete')) {
    return 'Cement & Concrete';
  }
  if (cat.includes('paint') || cat.includes('coating')) {
    return 'Paint & Coating';
  }
  if (cat.includes('wood') || cat.includes('timber')) {
    return 'Wood & Timber';
  }
  if (cat.includes('tile') || cat.includes('marble')) {
    return 'Tiles & Marble';
  }
  if (cat.includes('sanitary') || cat.includes('bathroom')) {
    return 'Sanitary';
  }
  if (cat.includes('hardware') || cat.includes('fittings')) {
    return 'Hardware & Fittings';
  }
  
  // Capitalize first letter of each word
  return category
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Normalize UOM
const normalizeUOM = (uom) => {
  if (!uom || !uom.trim()) return 'nos';
  
  const normalized = uom.toLowerCase().trim();
  const uomMap = {
    'no': 'nos',
    'number': 'nos',
    'piece': 'nos',
    'pieces': 'nos',
    'pcs': 'nos',
    'pc': 'nos',
    'kg': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'mt': 'mt',
    'metric ton': 'mt',
    'metric tons': 'mt',
    'ton': 'mt',
    'tons': 'mt',
    'm': 'm',
    'meter': 'm',
    'meters': 'm',
    'metre': 'm',
    'metres': 'm',
    'sqm': 'sqm',
    'sq m': 'sqm',
    'square meter': 'sqm',
    'square metre': 'sqm',
    'sqft': 'sqft',
    'sq ft': 'sqft',
    'square feet': 'sqft',
    'ltr': 'ltr',
    'liter': 'ltr',
    'litre': 'ltr',
    'liters': 'ltr',
    'litres': 'ltr',
  };
  
  return uomMap[normalized] || normalized;
};

// Parse number from cell value
const parseNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Main import function
async function importMaterials(filePath) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE);
    console.log('✅ Connected to MongoDB');

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read Excel file
    console.log(`📖 Reading file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '',
      raw: false 
    });

    console.log(`📊 Found ${data.length} rows in Excel file`);

    if (data.length === 0) {
      throw new Error('No data found in Excel file');
    }

    // Expected column names (case-insensitive matching)
    const findColumn = (row, possibleNames) => {
      const keys = Object.keys(row);
      for (const name of possibleNames) {
        const found = keys.find(
          key => key.toLowerCase().trim() === name.toLowerCase().trim()
        );
        if (found) return found;
      }
      return null;
    };

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Find columns (case-insensitive)
        const materialNameCol = findColumn(row, [
          'Material Name',
          'MaterialName',
          'Name',
          'Material',
          'Item Name',
          'ItemName'
        ]);
        
        const specsCol = findColumn(row, [
          'Specifications',
          'Specification',
          'Spec',
          'Description'
        ]);
        
        const additionalSpecCol = findColumn(row, [
          'Additional Specification',
          'AdditionalSpecification',
          'Additional Spec',
          'AdditionalSpec',
          'Additional Details',
          'AdditionalDetails'
        ]);
        
        const categoryCol = findColumn(row, [
          'Category',
          'Cat',
          'Type',
          'Material Type',
          'MaterialType'
        ]);
        
        const uomCol = findColumn(row, [
          'UOM',
          'Unit',
          'Unit of Measure',
          'UnitOfMeasure',
          'Unit of Measurement'
        ]);
        
        const stockCol = findColumn(row, [
          'In Stock',
          'InStock',
          'Opening Stock',
          'OpeningStock',
          'Stock',
          'Quantity',
          'Qty'
        ]);

        // Get values
        const materialName = row[materialNameCol]?.toString().trim();
        
        if (!materialName) {
          skipped++;
          continue;
        }

        const specifications = row[specsCol]?.toString().trim() || '';
        const additionalSpec = row[additionalSpecCol]?.toString().trim() || '';
        const category = normalizeCategory(row[categoryCol]?.toString().trim() || 'Other');
        const uom = normalizeUOM(row[uomCol]?.toString().trim() || 'nos');
        const openingStock = parseNumber(row[stockCol] || 0);

        // Combine specifications
        const combinedSpecs = [specifications, additionalSpec]
          .filter(s => s)
          .join(' | ');

        // Upsert material
        const material = await Material.findOneAndUpdate(
          { name: materialName, removed: false },
          {
            name: materialName,
            specifications: combinedSpecs || undefined,
            additionalSpec: additionalSpec || undefined,
            category: category,
            uom: uom,
            openingStock: openingStock,
            enabled: true,
            updated: new Date(),
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );

        if (material.isNew) {
          imported++;
        } else {
          updated++;
        }

        if ((i + 1) % 100 === 0) {
          console.log(`⏳ Processed ${i + 1}/${data.length} rows...`);
        }
      } catch (rowError) {
        errors.push({
          row: i + 2, // +2 because Excel rows start at 1 and we have header
          error: rowError.message,
        });
        skipped++;
      }
    }

    console.log('\n✅ Import completed!');
    console.log(`📈 Imported: ${imported} new materials`);
    console.log(`🔄 Updated: ${updated} existing materials`);
    console.log(`⏭️  Skipped: ${skipped} rows`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errors (${errors.length}):`);
      errors.slice(0, 10).forEach(err => {
        console.log(`   Row ${err.row}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');

    return {
      success: true,
      imported,
      updated,
      skipped,
      errors: errors.length,
    };
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Usage: node importMaterials.js <path-to-excel-file>');
    console.error('Example: node importMaterials.js "../kothari_construction_company_all_material_21_nov_2025 (1).xlsx"');
    process.exit(1);
  }

  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.resolve(__dirname, '..', filePath);

  importMaterials(absolutePath)
    .then((result) => {
      console.log('\n✅ Import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import failed:', error);
      process.exit(1);
    });
}

module.exports = importMaterials;
