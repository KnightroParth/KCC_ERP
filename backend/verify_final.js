const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbLine = envContent.split('\n').find(line => line.startsWith('DATABASE='));
const DATABASE = dbLine ? dbLine.split('=')[1].trim() : null;

if (!DATABASE) {
    console.error('DATABASE not found in .env');
    process.exit(1);
}

async function verify() {
    try {
        await mongoose.connect(DATABASE);
        const db = mongoose.connection.db;

        const projects = await db.collection('projects').find({
            name: { $in: [/Lotus Park/i, /Lotus Green/i] }
        }).toArray();

        console.log(`\n--- Verification Results ---`);
        for (const project of projects) {
            const count = await db.collection('workrates').countDocuments({ projectId: project._id });
            console.log(`Project: ${project.name} -> ${count} rates`);
        }

        const sample = await db.collection('workrates').findOne({
            projectId: { $in: projects.map(p => p._id) }
        });
        if (sample) {
            console.log('\nSample Rule Rate:', JSON.stringify(sample, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verify();
