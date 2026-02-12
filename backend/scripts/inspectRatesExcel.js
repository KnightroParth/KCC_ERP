const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join('c:', 'Users', 'Knightrovert', 'Desktop', 'KCC_ERP AI copy', 'At Glance Activity wise cost.xlsx');
try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    console.log('Total Rows:', rawData.length);
    rawData.forEach((row, i) => {
        // Only print rows that have at least a category or subcategory
        if (row[1] || row[2]) {
            console.log(`Row ${i}:`, JSON.stringify(row));
        }
    });
} catch (e) {
    console.error('Error reading file:', e.message);
}
