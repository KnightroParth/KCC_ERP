const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { globSync } = require('glob');

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

// Load all models
const modelsFiles = globSync('./src/models/**/*.js');
for (const filePath of modelsFiles) {
    require(path.resolve(filePath));
}

const Project = mongoose.model('Project');
const WorkRate = mongoose.model('WorkRate');

async function importRates() {
    try {
        await mongoose.connect(DATABASE);
        console.log('✅ Connected to Database');

        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheetNames = workbook.SheetNames;

        for (const sheetName of sheetNames) {
            if (sheetName === 'Instructions') continue;

            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet);

            console.log(`\nProcessing Sheet: ${sheetName}`);

            for (const row of data) {
                const projectName = row['Project Name'];
                if (!projectName) continue;

                // Find project
                const project = await Project.findOne({ name: new RegExp(projectName.trim(), 'i') });
                if (!project) {
                    console.warn(`⚠️ Project not found: ${projectName}`);
                    continue;
                }

                const building = row['Building'];
                const unitType = row['Unit Type'];
                const fromFloor = parseInt(row['From Floor']) || 0;
                const toFloor = parseInt(row['To Floor']) || 100;

                // Tasks are all other keys
                const tasks = Object.keys(row).filter(key =>
                    !['Project Name', 'Building', 'Unit Type', 'From Floor', 'To Floor', '__EMPTY'].includes(key)
                );

                for (const task of tasks) {
                    const rate = parseFloat(row[task]) || 0;

                    const query = {
                        projectId: project._id,
                        category: sheetName,
                        subCategory: task.trim(),
                        buildingName: building ? building.trim() : null,
                        unitType: unitType ? unitType.trim() : null,
                        minFloor: fromFloor,
                        maxFloor: toFloor,
                        unitNumber: null // Rules have no specific unit number
                    };

                    const update = {
                        ...query,
                        rate: rate,
                        updated: new Date()
                    };

                    await WorkRate.findOneAndUpdate(query, update, { upsert: true, new: true });
                }
            }
        }

        console.log('\n✅ Import Complete');
        process.exit(0);
    } catch (error) {
        console.error('🔥 Error during import:', error);
        process.exit(1);
    }
}

importRates();
