const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '..', 'SetRate_Template_Updated 17-02-26 LP & LG.xlsx');
const outputPath = path.join(__dirname, 'excel_structure.json');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    const overview = {};
    sheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (data.length > 0) {
            overview[name] = {
                headers: data[0] || [],
                sample: data[1] || []
            };
        }
    });

    fs.writeFileSync(outputPath, JSON.stringify(overview, null, 2));
    console.log(`Structure dumped to ${outputPath}`);
} catch (error) {
    console.error('Error reading Excel file:', error.message);
}
