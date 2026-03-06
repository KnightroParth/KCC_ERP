/**
 * Read-only script: lists sheet names and column headers from the Set Rate Excel template.
 * Use this to verify that Excel column names align with WORK_TASK_CONFIG and SUB_CATEGORY_ALIASES.
 * Run from repo root: node backend/scripts/verify_excel_headers.js
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const EXCEL_PATH = path.join(__dirname, '..', '..', 'SetRate_Template_Updated 17-02-26 LP & LG.xlsx');
const META_COLS = ['Project Name', 'Building', 'Unit Type', 'From Floor', 'To Floor', '__EMPTY'];

// Expected task names per category (from workConfig.js WORK_TASK_CONFIG) for alignment check
const EXPECTED_WATER_PROOFING = ['Chipping & Leakage Pipe', 'First Coat', 'Koba filling & Finishing', 'Wash up pipe & Concrete Finish'];

if (!fs.existsSync(EXCEL_PATH)) {
    console.error('❌ Excel file not found:', EXCEL_PATH);
    process.exit(1);
}

const workbook = XLSX.readFile(EXCEL_PATH);
const sheetNames = workbook.SheetNames.filter((n) => n !== 'Instructions' && n !== 'Sheet1');

console.log('📂 Excel:', EXCEL_PATH);
console.log('📋 Sheet names (used by import):', sheetNames.join(', '));
console.log('');

for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const headers = (data[0] || []).filter((h) => h != null && String(h).trim() !== '');
    const taskColumns = headers.filter((h) => !META_COLS.includes(String(h).trim()));
    console.log(`--- Sheet: "${sheetName}" ---`);
    console.log('  All headers:', headers.join(' | '));
    console.log('  Rate columns (task keys for import):', taskColumns.join(', '));

    if (sheetName.trim() === 'Water Proofing') {
        const missing = EXPECTED_WATER_PROOFING.filter((t) => !taskColumns.some((h) => String(h).trim() === t));
        const extra = taskColumns.filter((t) => !EXPECTED_WATER_PROOFING.some((e) => String(e).trim() === String(t).trim()));
        if (missing.length) console.log('  ⚠️  Expected (workConfig) but not in Excel:', missing);
        if (extra.length) console.log('  ℹ️  In Excel but not in workConfig Water Proofing:', extra);
        if (missing.length === 0 && extra.length === 0) console.log('  ✅ Water Proofing columns match workConfig.');
    }

    if (data.length > 1) {
        const firstDataRow = data[1] || [];
        const rowObj = {};
        headers.forEach((h, idx) => { if (h) rowObj[h] = firstDataRow[idx]; });
        console.log('  First data row (sample):', JSON.stringify(rowObj));
    }
    console.log('');
}

console.log('Done. Import uses these column headers as subCategory; SUB_CATEGORY_ALIASES maps variants to task names.');
