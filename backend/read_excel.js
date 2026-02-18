const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'SetRate_Template_Updated 17-02-26 LP & LG.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    console.log(JSON.stringify({ sheetNames }, null, 2));

    const result = {};
    sheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (data.length > 0) {
            result[name] = {
                headers: data[0],
                sampleRow: data[1] || []
            };
        }
    });
    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error('Error reading Excel file:', error.message);
}
