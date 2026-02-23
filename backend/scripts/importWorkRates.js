/**
 * Import WorkRates from Excel file (Set Rate template format).
 * Accepts file path and mongoose connection - used by both CLI and API.
 */
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');

// Ensure models are loaded
require(path.join(__dirname, '../src/models/appModels/WorkRate'));
require(path.join(__dirname, '../src/models/appModels/Project'));

const META_COLS = ['Project Name', 'Building', 'Unit Type', 'From Floor', 'To Floor', '__EMPTY'];

// Generate D-1 to D-42 array
const DUPLEX_UNITS = Array.from({ length: 42 }, (_, i) => `D-${i + 1}`);
const TARGET_BUILDINGS = ['C1', 'C2', 'C3', 'C4', 'C5'];

async function importWorkRatesFromFile(filePath, options = {}) {
    const { projectFilter, buildingFilter } = options;
    const buildingSet = Array.isArray(buildingFilter)
        ? new Set(buildingFilter.map(b => String(b).trim().toLowerCase()))
        : null;

    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames.filter(n => n !== 'Instructions');

    const Project = mongoose.model('Project');
    const WorkRate = mongoose.model('WorkRate');

    let targetProjects;
    if (projectFilter) {
        targetProjects = await Project.find({ ...projectFilter, removed: false });
    } else {
        targetProjects = await Project.find({ removed: false });
    }

    const projectMap = {};
    const projectIdentities = [];
    targetProjects.forEach(p => {
        const nameKey = p.name.toLowerCase().trim();
        projectMap[nameKey] = p;
        projectIdentities.push(p._id);
        projectIdentities.push(p._id.toString());
        if (p.projectCode) projectIdentities.push(p.projectCode);
    });

    // SELECTIVE CLEAR
    let deleteQueryBuildings = { projectId: { $in: projectIdentities } };
    if (buildingSet) {
        deleteQueryBuildings.buildingName = { $in: [...buildingSet].map(b => buildingFilter.find(x => String(x).trim().toLowerCase() === b) || b) };
    } else {
        // If no building filter, clear all TARGET_BUILDINGS (C1-C5) by default, or you can decide to wipe all
        // Let's wipe all for the targeted projects just in case, but let's be safe and wipe the specific ones
        deleteQueryBuildings.buildingName = { $in: TARGET_BUILDINGS };
    }

    // Wipe building rates
    const deleteResult = await WorkRate.deleteMany(deleteQueryBuildings);

    // Wipe Duplex units
    const deleteResultDuplex = await WorkRate.deleteMany({
        projectId: { $in: projectIdentities },
        unitNumber: { $in: DUPLEX_UNITS }
    });

    let totalImported = 0;

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
                const partial = targetProjects.find(p => p.name.toLowerCase().includes(projectNameKey) || projectNameKey.includes(p.name.toLowerCase()));
                currentProject = partial;
            }
            if (!currentProject) continue;

            const rawBuilding = row['Building'];
            const rawUnitType = row['Unit Type'];
            let unitType = (rawUnitType != null && String(rawUnitType).trim() !== '') ? String(rawUnitType).trim() : 'All';

            let fromFloor = parseInt(row['From Floor']);
            if (isNaN(fromFloor)) fromFloor = 0;
            let toFloor = parseInt(row['To Floor']);
            if (isNaN(toFloor)) toFloor = 1000;

            const taskKeys = (headers || []).filter(h => h && !META_COLS.includes(String(h).trim()));

            let buildingsToProcess = [];
            let unitsToProcess = [];

            if (rawBuilding && String(rawBuilding).toUpperCase().includes('DUPLEX')) {
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
                const matchedBuildings = buildingSet
                    ? allBuildings.filter(b => b && buildingSet.has(b.toLowerCase()))
                    : allBuildings.filter(b => b && TARGET_BUILDINGS.map(t => t.toLowerCase()).includes(b.toLowerCase()));

                if (matchedBuildings.length === 0) continue;

                // Expand C1,C2 to include all C1-C5 (if we're targeting those)
                if ((matchedBuildings.includes('C1') || matchedBuildings.includes('C2')) && (!buildingSet || buildingSet.has('c5'))) {
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

                for (const bName of buildingsToProcess) {
                    const payload = {
                        projectId: currentProject._id.toString(), // critical fix
                        category: currentCategory,
                        subCategory: (task || '').trim(),
                        buildingName: bName,
                        unitType,
                        minFloor: fromFloor,
                        maxFloor: toFloor,
                        unitNumber: null,
                        rate,
                        removed: false,
                        enabled: true,
                        isConsolidated: false,
                        componentActivities: [],
                    };
                    await new WorkRate(payload).save();
                    totalImported++;
                }

                for (const uName of unitsToProcess) {
                    const payload = {
                        projectId: currentProject._id.toString(), // critical fix
                        category: currentCategory,
                        subCategory: (task || '').trim(),
                        buildingName: null,
                        unitType,
                        minFloor: fromFloor,
                        maxFloor: toFloor,
                        unitNumber: uName,
                        rate,
                        removed: false,
                        enabled: true,
                        isConsolidated: false,
                        componentActivities: [],
                    };
                    await new WorkRate(payload).save();
                    totalImported++;
                }
            }
        }
    }

    return { totalImported, deletedCount: deleteResult.deletedCount + deleteResultDuplex.deletedCount };
}

module.exports = { importWorkRatesFromFile };
