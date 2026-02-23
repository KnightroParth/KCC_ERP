const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;

async function verifyImport() {
    try {
        await mongoose.connect(DATABASE);
        console.log('✅ Connected to Database');

        // Load all models
        const modelsFiles = globSync('./src/models/**/*.js');
        for (const filePath of modelsFiles) {
            require(path.resolve(filePath));
        }

        const Project = mongoose.model('Project');
        const WorkRate = mongoose.model('WorkRate');

        const lotusPark = await Project.findOne({ name: /Lotus Park/i });
        const lotusGreen = await Project.findOne({ name: /Lotus Green/i });

        if (lotusPark) {
            const count = await WorkRate.countDocuments({ projectId: lotusPark._id });
            console.log(`Lotus Park: ${count} rates imported`);
        } else {
            console.log('❌ Lotus Park project not found');
        }

        if (lotusGreen) {
            const count = await WorkRate.countDocuments({ projectId: lotusGreen._id });
            console.log(`Lotus Green: ${count} rates imported`);
        } else {
            console.log('❌ Lotus Green project not found');
        }

        // Sample rate
        const sample = await WorkRate.findOne({ projectId: { $in: [lotusPark?._id, lotusGreen?._id] } });
        if (sample) {
            console.log('Sample Record:', JSON.stringify(sample, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error during verification:', error);
        process.exit(1);
    }
}

verifyImport();
