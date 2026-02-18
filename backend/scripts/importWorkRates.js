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

async function importWorkRatesFromFile(filePath, options = {}) {
    const { projectFilter } = options; // e.g. { name: /Lotus Park/i } or null for all projects
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

    const deleteResult = await WorkRate.deleteMany({ projectId: { $in: projectIdentities } });
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
                const partial = targetProjects.find(p =>
                    p.name.toLowerCase().includes(projectNameKey) || projectNameKey.includes(p.name.toLowerCase())
                );
                currentProject = partial;
            }
            if (!currentProject) continue;

            const rawBuilding = row['Building'];
            const rawUnitType = row['Unit Type'];
            const unitType = (rawUnitType != null && String(rawUnitType).trim() !== '')
                ? String(rawUnitType).trim()
                : 'All';
            const fromFloor = parseInt(row['From Floor']) || 0;
            const toFloor = parseInt(row['To Floor']) || 1000;

            const taskKeys = headers.filter(h => h && !META_COLS.includes(h));
            const buildings = rawBuilding ? String(rawBuilding).split(/,\s*/).map(b => b.trim()).filter(Boolean) : [null];

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
            }
        }
    }

    return { totalImported, deletedCount: deleteResult.deletedCount };
}

module.exports = { importWorkRatesFromFile };
