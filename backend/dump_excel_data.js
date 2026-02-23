const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'SetRate_Template_Updated 17-02-26 LP & LG.xlsx');
const workbook = XLSX.readFile(filePath);

const targetProjects = ['Lotus Park', 'Lotus Green'];

workbook.SheetNames.forEach(sheetName => {
    if (sheetName === 'Instructions') return;

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = data[0];
    const taskCols = headers.filter(h => h && !['Project Name', 'Building', 'Unit Type', 'From Floor', 'To Floor'].includes(h));

    let currentCategory = sheetName;

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const rowObj = {};
        headers.forEach((h, idx) => { if (h) rowObj[h] = row[idx]; });

        const projectName = String(rowObj['Project Name'] || '').trim();
        const projMatch = targetProjects.some(p => projectName.toLowerCase().includes(p.toLowerCase()));
        if (!projMatch || !projectName || projectName.includes('Name Here')) continue;

        if (sheetName === 'Civil Work') {
            const first = String(row[0] || '').trim();
            if (first.includes('Loft Centering')) { currentCategory = 'Civil Work (Loft Centering)'; continue; }
            if (first.includes('Loft Casting')) { currentCategory = 'Civil Work (Loft Casting)'; continue; }
        }

        console.log(`\n--- ${sheetName} / ${currentCategory} | ${projectName} | Bld: ${rowObj['Building']} | Unit: ${rowObj['Unit Type']} | Floors: ${rowObj['From Floor']}-${rowObj['To Floor']} ---`);
        taskCols.forEach(col => {
            const val = rowObj[col];
            const num = parseFloat(val);
            const display = (val === null || val === undefined || val === '') ? 'EMPTY' : (isNaN(num) ? String(val) : num);
            if (display !== 'EMPTY' && display !== 0) console.log(`  ${col}: ${display}`);
        });
    }
});
