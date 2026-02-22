/**
 * Final Set Rate import: imports all rates from SetRate_Template_Updated 17-02-26 LP & LG.xlsx
 * for every project in the sheet EXCEPT Lotus Height. Handles every building (A1, A2, A3, B1, C1–C5, DUPLEX),
 * floor parsing (0/Ground/Lower Ground), and Civil Work sub-headers.
 *
 * Usage: node backend/scripts/import_rates.js
 * Ensure .env has DATABASE/MONGODB_URI and the Excel file is at project root.
 */
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;
const EXCEL_PATH = path.join(__dirname, '..', '..', 'SetRate_Template_Updated 17-02-26 LP & LG.xlsx');

/** Projects to exclude from import (rates left unchanged). */
const PROJECT_EXCLUDE = ['Lotus Height'];

const META_COLS = ['Project Name', 'Building', 'Unit Type', 'From Floor', 'To Floor', '__EMPTY'];

// C1–C5: when sheet has C1 and/or C2 (or "C1,C2"), we create rates for all C1, C2, C3, C4, C5
const C1_TO_C5 = ['C1', 'C2', 'C3', 'C4', 'C5'];

function parseFloorCell(value, defaultWhenEmpty) {
    if (value === null || value === undefined || value === '') return defaultWhenEmpty;
    const str = String(value).toLowerCase().trim();
    const textToFloor = {
        'ground': 0, 'lower ground': 0, 'lg': 0, 'g': 0,
        'upper ground': 0, 'ug': 0
    };
    if (textToFloor[str] !== undefined) return textToFloor[str];
    const num = parseInt(str, 10);
    return isNaN(num) ? defaultWhenEmpty : num;
}

/**
 * From Building column value, return list of building names to create rates for.
 * - "C1,C2" or "C1" or "C2" -> expand to C1, C2, C3, C4, C5
 * - "A1,A2" -> ["A1", "A2"]
 * - "A1,A2,A3" -> ["A1", "A2", "A3"]
 * - "B1" -> ["B1"]
 * - "DUPLEX (GROUND FLOOR)" / "DUPLEX (FIRST FLOOR)" -> keep as single building name
 */
function resolveBuildings(rawBuilding) {
    if (!rawBuilding || String(rawBuilding).trim() === '') return [null];
    const parts = String(rawBuilding).split(/,\s*/).map(b => b.trim()).filter(Boolean);
    if (parts.length === 0) return [null];
    const lower = parts.map(p => p.toLowerCase());
    const hasC1 = lower.some(p => p === 'c1');
    const hasC2 = lower.some(p => p === 'c2');
    if (hasC1 || hasC2) return [...C1_TO_C5];
    return parts;
}

function isExcludedProject(projectName) {
    if (!projectName || String(projectName).includes('Name Here')) return true;
    const name = String(projectName).toLowerCase().trim();
    return PROJECT_EXCLUDE.some(ex => name === ex.toLowerCase().trim());
}

/** Sub-header / category text that must not be treated as project names (e.g. Civil Work sheet). */
const NOT_PROJECT_NAMES = ['Loft Centering & Steel Binding', 'Loft Casting', 'Loft Centering', 'Loft Casting & Steel Binding'];

/**
 * Scan workbook for all unique "Project Name" values (excluding placeholders, PROJECT_EXCLUDE, and category sub-headers).
 */
function getProjectNamesFromWorkbook(workbook) {
    const names = new Set();
    const sheetNames = workbook.SheetNames.filter(n => n !== 'Instructions' && n !== 'Sheet1');
    for (const sheetName of sheetNames) {
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        const headers = data[0] || [];
        const pIdx = headers.findIndex(h => h && String(h).toLowerCase().includes('project') && String(h).toLowerCase().includes('name'));
        if (pIdx < 0) continue;
        for (let i = 1; i < data.length; i++) {
            const row = data[i] || [];
            const val = (row[pIdx] || '').toString().trim();
            if (!val || val.includes('Name Here') || isExcludedProject(val)) continue;
            if (NOT_PROJECT_NAMES.some(n => val.toLowerCase().includes(n.toLowerCase()))) continue;
            names.add(val);
        }
    }
    return [...names];
}

async function runImport() {
    if (!DATABASE) {
        console.error('❌ DATABASE is not set.');
        process.exit(1);
    }
    console.log('📂 Excel Path:', EXCEL_PATH);
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error('❌ Excel file not found at path:', EXCEL_PATH);
        process.exit(1);
    }

    try {
        await mongoose.connect(DATABASE);
        console.log('✅ Connected to MongoDB');

        require(path.join(backendDir, 'src/models/appModels/Project'));
        require(path.join(backendDir, 'src/models/appModels/WorkRate'));

        const Project = mongoose.model('Project');
        const WorkRate = mongoose.model('WorkRate');

        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheetProjectNames = getProjectNamesFromWorkbook(workbook);
        console.log('✅ Projects in sheet (to import):', sheetProjectNames.join(', ') || '(none)');
        console.log('⏭️  Excluded from import:', PROJECT_EXCLUDE.join(', '));

        // Resolve DB projects: all non-removed projects whose name matches a sheet project name
        const allProjects = await Project.find({ removed: false }).lean();
        const targetProjects = [];
        const projectMap = {};
        const projectIdentities = [];

        for (const sheetName of sheetProjectNames) {
            const sheetKey = sheetName.toLowerCase().trim();
            let project = allProjects.find(p => p.name.toLowerCase().trim() === sheetKey)
                || allProjects.find(p => p.name.toLowerCase().includes(sheetKey) || sheetKey.includes(p.name.toLowerCase()));
            if (project) {
                project = await Project.findById(project._id);
                if (!targetProjects.find(p => p._id.toString() === project._id.toString())) {
                    targetProjects.push(project);
                    projectMap[sheetKey] = project;
                    projectIdentities.push(project._id);
                    projectIdentities.push(project._id.toString());
                    if (project.projectCode) projectIdentities.push(project.projectCode);
                }
            }
        }

        console.log('✅ Target projects (in DB):', targetProjects.map(p => p.name).join(', '));

        if (targetProjects.length === 0) {
            console.log('⚠️ No matching projects in DB for sheet names. Nothing to import.');
            process.exit(0);
        }

        // Full replace: clear all rates for these projects only (Lotus Height untouched)
        const deleteResult = await WorkRate.deleteMany({
            projectId: { $in: projectIdentities }
        });
        console.log(`🧹 Cleared ${deleteResult.deletedCount} existing rates for ${targetProjects.length} project(s)`);

        const sheetNames = workbook.SheetNames.filter(n => n !== 'Instructions' && n !== 'Sheet1');

        let totalImported = 0;

        for (const sheetName of sheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const headers = data[0] || [];

            let currentCategory = sheetName.trim();
            console.log(`📄 Processing Sheet: ${sheetName}`);

            for (let i = 1; i < data.length; i++) {
                const rowArr = data[i];
                if (!rowArr || rowArr.length === 0) continue;

                // Civil Work sub-headers
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
                headers.forEach((h, idx) => { if (h) row[String(h).trim()] = rowArr[idx]; });

                const rawProjectName = row['Project Name'];
                if (!rawProjectName || String(rawProjectName).includes('Name Here')) continue;
                if (isExcludedProject(rawProjectName)) continue; // e.g. Lotus Height

                const projectNameKey = String(rawProjectName).toLowerCase().trim();
                let currentProject = projectMap[projectNameKey];
                if (!currentProject) {
                    currentProject = targetProjects.find(p =>
                        p.name.toLowerCase().includes(projectNameKey) || projectNameKey.includes(p.name.toLowerCase())
                    );
                }
                if (!currentProject) continue;

                const rawBuilding = row['Building'];
                const buildings = resolveBuildings(rawBuilding);

                const rawUnitType = row['Unit Type'];
                const unitType = (rawUnitType != null && String(rawUnitType).trim() !== '')
                    ? String(rawUnitType).trim()
                    : 'All';

                let fromFloor = parseFloorCell(row['From Floor'], 0);
                let toFloor = parseFloorCell(row['To Floor'], 1000);

                // DUPLEX (GROUND FLOOR) -> 0–0, DUPLEX (FIRST FLOOR) -> 1–1
                if (rawBuilding && String(rawBuilding).toUpperCase().includes('DUPLEX')) {
                    if (String(rawBuilding).toUpperCase().includes('GROUND')) {
                        fromFloor = 0;
                        toFloor = 0;
                    } else if (String(rawBuilding).toUpperCase().includes('FIRST')) {
                        fromFloor = 1;
                        toFloor = 1;
                    }
                }

                const taskKeys = headers.filter(h => {
                    const s = String(h).trim();
                    return s && !META_COLS.includes(s) && !s.startsWith('__EMPTY');
                });

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
                            buildingName: bName ? String(bName).trim() : null,
                            unitType,
                            minFloor: fromFloor,
                            maxFloor: toFloor,
                            unitNumber: null,
                            rate,
                            removed: false,
                            enabled: true,
                            isConsolidated: false,
                            componentActivities: []
                        };

                        await WorkRate.create(payload);
                        totalImported++;
                    }
                }
            }
        }

        console.log(`\n✅ Import complete. Total rates: ${totalImported}`);
        if (deleteResult.deletedCount > totalImported) {
            console.log(`ℹ️  Note: Deleted ${deleteResult.deletedCount} old rates, imported ${totalImported}. This is normal if the previous DB had per-unit Duplex rates (e.g. D-1…D-42) or duplicate entries; the sheet uses one rate per building/task.`);
        }
        process.exit(0);
    } catch (error) {
        console.error('🔥 Error:', error);
        process.exit(1);
    }
}

runImport();
