const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:\\Users\\Knightrovert\\Desktop\\26022026\\Planning Report vs Report vs Pending work.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n=== SHEET: ${sheetName} ===`);
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        data.forEach((row, index) => {
            if (row.length === 0) return;
            const rowStr = row.map(cell => cell === null ? 'null' : String(cell)).join(' | ');
            if (rowStr.includes('TOTAL') || index < 20 || index > data.length - 10) {
                console.log(`[R${index}] ${rowStr}`);
            }
        });
    });
} catch (error) {
    console.error('Error reading Excel:', error.message);
}
