/**
 * Mark Lotus Height as fully done: building completed, no work to be done.
 * - Sets project status to 'Complete'
 * - Sets all Activities for Lotus Height to progress '100%' and status 'Completed'
 *
 * Usage: node backend/scripts/markLotusHeightPlanningDone.js [--dry-run]
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

require('../src/models/appModels/Project');
require('../src/models/appModels/Activities');

const Project = mongoose.model('Project');
const Activities = mongoose.model('Activities');

const PROJECT_NAME = 'Lotus Height';

async function run() {
    const dryRun = process.argv.includes('--dry-run');
    if (dryRun) console.log('🔍 DRY RUN – no changes will be saved.\n');

    try {
        await mongoose.connect(process.env.DATABASE || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const project = await Project.findOne({ name: new RegExp(`^${PROJECT_NAME}$`, 'i'), removed: { $ne: true } });
        if (!project) {
            console.error(`❌ Project "${PROJECT_NAME}" not found.`);
            process.exit(1);
        }

        const projectId = project._id;
        console.log(`📍 Project: ${project.name} (ID: ${projectId})\n`);

        // 1. Update project status to Complete
        const currentStatus = project.status;
        if (currentStatus !== 'Complete') {
            if (!dryRun) {
                await Project.updateOne({ _id: projectId }, { $set: { status: 'Complete', updated: new Date() } });
                console.log(`✅ Project status updated: ${currentStatus} → Complete`);
            } else {
                console.log(`[DRY RUN] Would update project status: ${currentStatus} → Complete`);
            }
        } else {
            console.log(`ℹ️  Project status already Complete`);
        }

        // 2. Mark all activities for this project as 100% and Completed
        const activityQuery = { projectId, removed: { $ne: true } };
        const toUpdate = await Activities.countDocuments(activityQuery);

        if (toUpdate === 0) {
            console.log(`ℹ️  No activities found for this project (already clean or none created).`);
        } else if (!dryRun) {
            const activityResult = await Activities.updateMany(activityQuery, {
                $set: { progress: '100%', status: 'Completed', updated: new Date() }
            });
            console.log(`✅ Activities updated: ${activityResult.modifiedCount} set to 100% / Completed (matched: ${activityResult.matchedCount})`);
        } else {
            console.log(`[DRY RUN] Would set ${toUpdate} activities to 100% / Completed`);
        }

        console.log('\n✅ Lotus Height planning marked as done (building completed).');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

run();
