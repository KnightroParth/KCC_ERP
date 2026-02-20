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
            projectIdentities.push(p.projectCode);
        });

        console.log('✅ Target Projects found in DB:', targetProjects.map(p => p.name));

        // SELECTIVE CLEAR: only remove rates for C1-C5 buildings (Lotus Park duplex block)
        const TARGET_BUILDINGS = ['C1', 'C2', 'C3', 'C4', 'C5'];
        const deleteResult = await WorkRate.deleteMany({
            projectId: { $in: projectIdentities },
            buildingName: { $in: TARGET_BUILDINGS }
        });
        console.log(`🧹 Cleared ${deleteResult.deletedCount} existing rates for buildings: ${TARGET_BUILDINGS.join(', ')}`);

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

                if (String(rowArr[1] || '').includes('C1') || String(rowArr[1] || '').includes('C2')) {
                    console.log(`[DEBUG FOUND C1/C2 Row:${i}] Sheet:${sheetName} Raw:${JSON.stringify(rowArr)}`);
                }
                if (JSON.stringify(rowArr).includes('260')) {
                    console.log(`[DEBUG FOUND 260 Row:${i}] Sheet:${sheetName} Raw:${JSON.stringify(rowArr)}`);
                }

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
                const unitType = (rawUnitType != null && String(rawUnitType).trim() !== '')
                    ? String(rawUnitType).trim()
                    : 'All';
                const fromFloor = parseInt(row['From Floor']) || 0;
                const toFloor = parseInt(row['To Floor']) || 1000;

                const metaCols = ['Project Name', 'Building', 'Unit Type', 'From Floor', 'To Floor', '__EMPTY'];
                const taskKeys = (headers || []).filter(h => h && !metaCols.includes(String(h).trim()));

                const allBuildings = rawBuilding ? String(rawBuilding).split(/,\s*/).map(b => b.trim()).filter(Boolean) : [null];
                // Only process buildings in our target list
                const buildings = allBuildings.filter(b => b && TARGET_BUILDINGS.map(t => t.toLowerCase()).includes(b.toLowerCase()));
                if (buildings.length === 0) {
                    if (i >= 5 && i <= 7) {
                        console.log(`[DEBUG SKIPPED Row:${i}] RawBuilding: "${rawBuilding}" Filtered: ${JSON.stringify(buildings)}`);
                    }
                    continue; // row has no matching buildings
                }

                for (const bName of buildings) {
                    for (const task of taskKeys) {
                        const rateValue = row[task];
                        let rate = 0;
                        if (rateValue != null && rateValue !== '') {
                            const parsed = typeof rateValue === 'number' ? rateValue : parseFloat(String(rateValue).trim());
                            rate = isNaN(parsed) ? 0 : parsed;
                        }

                        const payload = {
                            projectId: new mongoose.Types.ObjectId(currentProject._id.toString()),
                            category: currentCategory,
                            subCategory: (task || '').trim(),
                            buildingName: bName ? bName.trim() : null,
                            unitType: unitType,
                            minFloor: fromFloor,
                            maxFloor: toFloor,
                            unitNumber: null,
                            rate: isNaN(rate) ? 0 : rate,
                            updated: new Date(),
                            removed: false,
                            enabled: true,
                            isConsolidated: false,
                            componentActivities: []
                        };

                        if (i >= 5 && i <= 7) {
                            console.log(`[DEBUG LOG Row:${i}] Task:${task} Headers:`, JSON.stringify(headers));
                            console.log(`[DEBUG LOG Row:${i}] RowArr:`, JSON.stringify(rowArr));
                            console.log(`[DEBUG LOG Row:${i}] Building: ${bName}, UnitType: ${unitType}, Parsed: ${rate}`);
                        }

                        if (bName === 'C2' && currentCategory === 'Mivan' && task === 'Mivan Centering') {
                            console.log(`[DEBUG C2 Mivan] Row:${i} RateRaw:${rateValue} Parsed:${rate} UnitType:${unitType} Floor:${fromFloor}-${toFloor}`);
                        }

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
