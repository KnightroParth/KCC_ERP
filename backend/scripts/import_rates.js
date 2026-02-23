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

// Generate D-1 to D-42 array
const DUPLEX_UNITS = Array.from({ length: 42 }, (_, i) => `D-${i + 1}`);
const TARGET_BUILDINGS = ['C1', 'C2', 'C3', 'C4', 'C5'];

async function runImport() {
    try {
        await mongoose.connect(DATABASE);
        console.log('✅ Connected to MongoDB');

        // Explicitly load models
        require(path.join(backendDir, 'src/models/appModels/Project'));
        require(path.join(backendDir, 'src/models/appModels/WorkRate'));

        const Project = mongoose.model('Project');
        const WorkRate = mongoose.model('WorkRate');

        // Identify target projects first
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

        console.log('✅ Target Projects found in DB:', targetProjects.map(p => p.name));

        // SELECTIVE CLEAR: remove rates for C1-C5 buildings (Lotus Park duplex block)
        let deleteResult = await WorkRate.deleteMany({
            projectId: { $in: projectIdentities },
            buildingName: { $in: TARGET_BUILDINGS }
        });
        console.log(`🧹 Cleared ${deleteResult.deletedCount} existing rates for buildings: ${TARGET_BUILDINGS.join(', ')}`);

        // Also remove generic Duplex unit rates (D-1 to D-42)
        let deleteResultDuplex = await WorkRate.deleteMany({
            projectId: { $in: projectIdentities },
            unitNumber: { $in: DUPLEX_UNITS }
        });
        console.log(`🧹 Cleared ${deleteResultDuplex.deletedCount} existing rates for Duplex units: D-1 to D-42`);

        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheetNames = workbook.SheetNames;

        let totalImported = 0;

        for (const sheetName of sheetNames) {
            if (sheetName === 'Instructions') continue;

            const sheet = workbook.Sheets[sheetName];
            // Use header: 1 to handle sub-headers manually in Civil Work
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const headers = data[0] || [];

            console.log(`📄 Processing Sheet: ${sheetName}`);

            let currentCategory = sheetName.trim();

            // Start from row 1 (skipping header)
            for (let i = 1; i < data.length; i++) {
                const rowArr = data[i];
                if (!rowArr || rowArr.length === 0) continue;

                // Sub-header detection for Civil Work
                if (sheetName.trim() === 'Civil Work') {
                    const firstCell = String(rowArr[0] || '').trim();
                    if (firstCell.includes('Loft Centering')) {
                        currentCategory = 'Civil Work (Loft Centering)';
                        continue;
                    } else if (firstCell.includes('Loft Casting')) {
                        currentCategory = 'Civil Work (Loft Casting)';
                        continue;
                    }
                }

                // Standard row processing
                const row = {};
                headers.forEach((h, idx) => { if (h) row[h] = rowArr[idx]; });

                const rawProjectName = row['Project Name'];
                if (!rawProjectName || String(rawProjectName).includes('Name Here')) continue;

                const projectNameKey = String(rawProjectName).toLowerCase().trim();
                let currentProject = projectMap[projectNameKey];

                if (!currentProject) {
                    const partialMatch = targetProjects.find(p => p.name.toLowerCase().includes(projectNameKey) || projectNameKey.includes(p.name.toLowerCase()));
                    if (partialMatch) currentProject = partialMatch;
                    else continue;
                }

                const rawBuilding = row['Building'];
                const rawUnitType = row['Unit Type'];
                let unitType = (rawUnitType != null && String(rawUnitType).trim() !== '')
                    ? String(rawUnitType).trim()
                    : 'All';

                let fromFloor = parseInt(row['From Floor']);
                if (isNaN(fromFloor)) fromFloor = 0;
                let toFloor = parseInt(row['To Floor']);
                if (isNaN(toFloor)) toFloor = 1000;

                const metaCols = ['Project Name', 'Building', 'Unit Type', 'From Floor', 'To Floor', '__EMPTY'];
                const taskKeys = (headers || []).filter(h => h && !metaCols.includes(String(h).trim()));

                let buildingsToProcess = [];
                let unitsToProcess = [];

                if (rawBuilding && String(rawBuilding).toUpperCase().includes('DUPLEX')) {
                    // This is a Duplex row!
                    if (String(rawBuilding).toUpperCase().includes('GROUND')) {
                        fromFloor = 0;
                        toFloor = 0;
                    } else if (String(rawBuilding).toUpperCase().includes('FIRST')) {
                        fromFloor = 1;
                        toFloor = 1;
                    }

                    unitsToProcess = DUPLEX_UNITS;
                    unitType = 'Duplex';
                } else {
                    const allBuildings = rawBuilding ? String(rawBuilding).split(/,\s*/).map(b => b.trim()).filter(Boolean) : [null];
                    const matchedBuildings = allBuildings.filter(b => b && TARGET_BUILDINGS.map(t => t.toLowerCase()).includes(b.toLowerCase()));

                    if (matchedBuildings.length === 0) continue;

                    // Expand C1,C2 to include all C1-C5
                    if (matchedBuildings.includes('C1') || matchedBuildings.includes('C2')) {
                        buildingsToProcess = [...TARGET_BUILDINGS];
                    } else {
                        buildingsToProcess = matchedBuildings;
                    }
                }

                if (buildingsToProcess.length === 0 && unitsToProcess.length === 0) continue;

                for (const task of taskKeys) {
                    const rateValue = row[task];
                    let rate = 0;
                    if (rateValue != null && rateValue !== '') {
                        const parsed = typeof rateValue === 'number' ? rateValue : parseFloat(String(rateValue).trim());
                        rate = isNaN(parsed) ? 0 : parsed;
                    }

                    // Process Building-wide rates
                    for (const bName of buildingsToProcess) {
                        const payload = {
                            projectId: currentProject._id.toString(), // Fix: Store as strong
                            category: currentCategory,
                            subCategory: (task || '').trim(),
                            buildingName: bName,
                            unitType: unitType,
                            minFloor: fromFloor,
                            maxFloor: toFloor,
                            unitNumber: null,
                            rate: rate,
                            updated: new Date(),
                            removed: false,
                            enabled: true,
                            isConsolidated: false,
                            componentActivities: []
                        };
                        await new WorkRate(payload).save();
                        totalImported++;
                    }

                    // Process Unit-specific rates (Duplex)
                    for (const uName of unitsToProcess) {
                        const payload = {
                            projectId: currentProject._id.toString(), // Fix: Store as string
                            category: currentCategory,
                            subCategory: (task || '').trim(),
                            buildingName: null,
                            unitType: unitType,
                            minFloor: fromFloor,
                            maxFloor: toFloor,
                            unitNumber: uName,
                            rate: rate,
                            updated: new Date(),
                            removed: false,
                            enabled: true,
                            isConsolidated: false,
                            componentActivities: []
                        };
                        await new WorkRate(payload).save();
                        totalImported++;
                    }
                }
            }
        }

        console.log(`\n✅ Import Complete! Total: ${totalImported}`);
        process.exit(0);
    } catch (error) {
        console.error('🔥 Fatal Error:', error);
        process.exit(1);
    }
}

runImport();
