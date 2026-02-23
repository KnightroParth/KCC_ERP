/**
 * One-time script: Delete ALL Activity (Work In Progress) records for Lotus Green and Lotus Park.
 * Lotus Heights is NOT touched.
 * Run from /backend:  node scripts/deleteLotusParkGreenWIP.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.DATABASE || process.env.MONGODB_URI;

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Find the project IDs for Lotus Green and Lotus Park
    const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }), 'projects');
    const projects = await Project.find({
        name: { $in: [/lotus\s*green/i, /lotus\s*park/i] },
        removed: { $ne: true }
    }).lean();

    if (projects.length === 0) {
        console.log('No matching projects found. Check project names in DB.');
        process.exit(0);
    }

    projects.forEach(p => console.log(`Found project: "${p.name}" | _id: ${p._id} | code: ${p.projectCode}`));

    // Confirm none are Lotus Heights
    const hasHeights = projects.some(p => /lotus\s*height/i.test(p.name));
    if (hasHeights) {
        console.error('ERROR: Lotus Heights was matched! Aborting for safety.');
        process.exit(1);
    }

    const projectIds = projects.map(p => p._id);
    const projectCodes = projects.map(p => p.projectCode).filter(Boolean);

    const Activity = mongoose.model('Activity', new mongoose.Schema({}, { strict: false }), 'activities');

    const result = await Activity.deleteMany({
        $or: [
            { projectId: { $in: projectIds } },
            { projectId: { $in: projectCodes } }
        ]
    });

    console.log(`\n✅ Deleted ${result.deletedCount} Activity (WIP) records for Lotus Green & Lotus Park.`);
    await mongoose.disconnect();
}

main().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
