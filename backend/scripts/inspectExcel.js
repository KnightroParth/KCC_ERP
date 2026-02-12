const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join('..', 'contractorlist.xlsx');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log('Sheet Name:', sheetName);
console.log('First 10 rows:');
rawData.slice(0, 10).forEach((row, i) => {
    console.log(`Row ${i}:`, JSON.stringify(row));
});
