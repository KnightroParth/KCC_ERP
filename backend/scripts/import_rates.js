const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;
const EXCEL_PATH = path.join(__dirname, '..', '..', 'SetRate_Template_Updated 17-02-26 LP & LG.xlsx');

if (!DATABASE) {
    console.error('❌ DATABASE is not set.');
    process.exit(1);
}

console.log('📂 Excel Path:', EXCEL_PATH);
if (!fs.existsSync(EXCEL_PATH)) {
    console.error('❌ Excel file not found at path:', EXCEL_PATH);
    process.exit(1);
}

// Use first-floor rates only: only rows whose floor range includes floor 1
const FIRST_FLOOR_ONLY = true;
const APPLY_RATE_TO_ALL_FLOORS = true; // store as minFloor 0, maxFloor 100 so rate applies everywhere

const DUPLEX_UNITS = Array.from({ length: 42 }, (_, i) => `D-${i + 1}`);
const META_COLS = ['Project Name', 'Building', 'Unit Type', 'From Floor', 'To Floor', '__EMPTY'];

/** Parse Building column into list of building codes (A1, A2, C1, etc.). Handles "C1,C2,C3,C4,C5 = DUPLEX(..." */
function parseBuildings(rawBuilding) {
    if (!rawBuilding || typeof rawBuilding !== 'string') return [];
    const parts = String(rawBuilding).split(/,\s*/).map(s => s.trim()).filter(Boolean);
    const out = [];
    for (const p of parts) {
        let code = p;
        if (code.includes('=')) code = code.split('=')[0].trim();
        if (code.includes('(')) code = code.split('(')[0].trim();
        code = code.trim();
        if (!code) continue;
        if (/^(GROUND|FIRST|DUPLEX|example|D-)/i.test(code)) continue;
        if (/^[A-Za-z0-9]+$/.test(code)) out.push(code);
    }
    return [...new Set(out)];
}

/** Row applies to first floor if fromFloor <= 1 && toFloor >= 1, or Duplex FIRST FLOOR */
function rowIncludesFirstFloor(fromFloor, toFloor, rawBuilding, isDuplexRow) {
    if (isDuplexRow && rawBuilding && String(rawBuilding).toUpperCase().includes('FIRST')) return true;
    return fromFloor <= 1 && toFloor >= 1;
}

async function runImport() {
    try {
        await mongoose.connect(DATABASE);
        console.log('✅ Connected to MongoDB');

        require(path.join(backendDir, 'src/models/appModels/Project'));
        require(path.join(backendDir, 'src/models/appModels/WorkRate'));

        const Project = mongoose.model('Project');
        const WorkRate = mongoose.model('WorkRate');

        const targetProjects = await Project.find({
            name: { $in: [/Lotus Park/i, /Lotus Green/i] },
            removed: false
        });

        const projectMap = {};
        const projectIdentities = [];
        targetProjects.forEach(p => {
            const nameKey = p.name.toLowerCase().trim();
            projectMap[nameKey] = p;
            projectIdentities.push(p._id);
            projectIdentities.push(p._id.toString());
            if (p.projectCode) projectIdentities.push(p.projectCode);
        });

        console.log('✅ Target Projects:', targetProjects.map(p => p.name));

        // Clear ALL existing rates for Lotus Park and Lotus Green (so we fill everywhere from template)
        const deleteResult = await WorkRate.deleteMany({
            projectId: { $in: projectIdentities }
        });
        console.log(`🧹 Cleared ${deleteResult.deletedCount} existing rates for Lotus Park & Lotus Green`);

        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheetNames = workbook.SheetNames.filter(n => n !== 'Instructions' && n !== 'Sheet1');

        const bulkPayloads = [];

        for (const sheetName of sheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const headers = data[0] || [];
            let currentCategory = sheetName.trim();

            for (let i = 1; i < data.length; i++) {
                const rowArr = data[i];
                if (!rowArr || rowArr.length === 0) continue;

                if (sheetName.trim() === 'Civil Work') {
                    const firstCell = String(rowArr[0] || '').trim();
                    if (firstCell.includes('Loft Centering')) {
                        currentCategory = 'Civil Work (Loft Centering)';
                        continue;
                    }
                    if (firstCell.includes('Loft Casting')) {
                        currentCategory = 'Civil Work (Loft Casting)';
                        continue;
                    }
                }

                const row = {};
                headers.forEach((h, idx) => { if (h) row[h] = rowArr[idx]; });

                const rawProjectName = row['Project Name'];
                if (!rawProjectName || String(rawProjectName).includes('Name Here')) continue;

                const projectNameKey = String(rawProjectName).toLowerCase().trim();
                let currentProject = projectMap[projectNameKey];
                if (!currentProject) {
                    currentProject = targetProjects.find(p =>
                        p.name.toLowerCase().includes(projectNameKey) || projectNameKey.includes(p.name.toLowerCase())
                    );
                }
                if (!currentProject) continue;

                const rawBuilding = row['Building'];
                const rawUnitType = row['Unit Type'];
                let unitType = (rawUnitType != null && String(rawUnitType).trim() !== '')
                    ? String(rawUnitType).trim()
                    : 'All';

                let fromFloor = parseInt(row['From Floor'], 10);
                if (isNaN(fromFloor)) fromFloor = 0;
                let toFloor = parseInt(row['To Floor'], 10);
                if (isNaN(toFloor)) toFloor = 1000;

                const isDuplexRow = rawBuilding && String(rawBuilding).toUpperCase().includes('DUPLEX');
                if (FIRST_FLOOR_ONLY && !rowIncludesFirstFloor(fromFloor, toFloor, rawBuilding, isDuplexRow)) continue;

                const taskKeys = (headers || []).filter(h => h && !META_COLS.includes(String(h).trim()));

                let buildingsToProcess = [];
                let unitsToProcess = [];

                if (isDuplexRow) {
                    if (String(rawBuilding).toUpperCase().includes('GROUND')) {
                        fromFloor = 0;
                        toFloor = 0;
                    } else if (String(rawBuilding).toUpperCase().includes('FIRST')) {
                        fromFloor = 1;
                        toFloor = 1;
                    }
                    unitsToProcess = DUPLEX_UNITS;
                    unitType = 'Duplex';
                    buildingsToProcess = [];
                } else {
                    buildingsToProcess = parseBuildings(rawBuilding);
                    if (buildingsToProcess.length === 0) continue;
                }

                const minF = APPLY_RATE_TO_ALL_FLOORS ? 0 : fromFloor;
                const maxF = APPLY_RATE_TO_ALL_FLOORS ? 100 : toFloor;

                for (const task of taskKeys) {
                    const rateValue = row[task];
                    let rate = 0;
                    if (rateValue != null && rateValue !== '') {
                        const parsed = typeof rateValue === 'number' ? rateValue : parseFloat(String(rateValue).trim());
                        rate = isNaN(parsed) ? 0 : parsed;
                    }

                    for (const bName of buildingsToProcess) {
                        bulkPayloads.push({
                            projectId: currentProject._id.toString(),
                            category: currentCategory,
                            subCategory: (task || '').trim(),
                            buildingName: bName,
                            unitType,
                            minFloor: minF,
                            maxFloor: maxF,
                            unitNumber: null,
                            rate,
                            removed: false,
                            enabled: true,
                            isConsolidated: false,
                            componentActivities: []
                        });
                    }

                    for (const uName of unitsToProcess) {
                        bulkPayloads.push({
                            projectId: currentProject._id.toString(),
                            category: currentCategory,
                            subCategory: (task || '').trim(),
                            buildingName: null,
                            unitType,
                            minFloor: APPLY_RATE_TO_ALL_FLOORS ? 0 : fromFloor,
                            maxFloor: APPLY_RATE_TO_ALL_FLOORS ? 100 : toFloor,
                            unitNumber: uName,
                            rate,
                            removed: false,
                            enabled: true,
                            isConsolidated: false,
                            componentActivities: []
                        });
                    }
                }
            }
        }

        const BATCH = 500;
        let totalImported = 0;
        for (let i = 0; i < bulkPayloads.length; i += BATCH) {
            const chunk = bulkPayloads.slice(i, i + BATCH);
            await WorkRate.insertMany(chunk);
            totalImported += chunk.length;
        }

        console.log(`\n✅ Import complete. Total rates imported: ${totalImported}`);
        process.exit(0);
    } catch (error) {
        console.error('🔥 Fatal Error:', error);
        process.exit(1);
    }
}

runImport();
