const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'SetRate_Template_Updated 17-02-26 LP & LG.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    console.log('--- EXCEL STRUCTURE ---');
    sheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (data.length > 0) {
            console.log(`Sheet: ${name}`);
            console.log('  Headers:', JSON.stringify(data[0]));
            if (data[1]) console.log('  Sample Row 1:', JSON.stringify(data[1]));
        }
    });

} catch (error) {
    console.error('Error reading Excel file:', error.message);
}
