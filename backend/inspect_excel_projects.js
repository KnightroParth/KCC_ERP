const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'SetRate_Template_Updated 17-02-26 LP & LG.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Mivan'];
    const data = XLSX.utils.sheet_to_json(sheet);

    const projectsInExcel = [...new Set(data.map(row => row['Project Name']))];
    console.log('Projects in Mivan Excel sheet:');
    projectsInExcel.forEach(p => console.log(`"${p}"`));

} catch (error) {
    console.error('Error:', error.message);
}
