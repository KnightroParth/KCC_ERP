const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'SetRate_Template_Updated 17-02-26 LP & LG.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    const overview = sheetNames.map(name => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        return {
            sheet: name,
            headers: data[0] || [],
            sample: data[1] || []
        };
    });

    console.log(JSON.stringify(overview, null, 2));
} catch (error) {
    console.error('Error reading Excel file:', error.message);
}
