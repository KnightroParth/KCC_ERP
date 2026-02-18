const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;

async function verifyRaw() {
    try {
        await mongoose.connect(DATABASE);
        const db = mongoose.connection.db;

        const projects = await db.collection('projects').find({
            name: { $in: [/Lotus Park/i, /Lotus Green/i] }
        }).toArray();

        for (const project of projects) {
            const count = await db.collection('workrates').countDocuments({ projectId: project._id });
            console.log(`Project: ${project.name} (_id: ${project._id}) -> ${count} rates`);
        }

        const sample = await db.collection('workrates').findOne({
            projectId: { $in: projects.map(p => p._id) }
        });
        if (sample) {
            console.log('Sample Rule Rate (no unitNumber):', JSON.stringify(sample, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verifyRaw();
