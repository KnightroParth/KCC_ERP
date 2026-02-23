require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

// Define models briefly for access
const PlannedWork = mongoose.model('PlannedWork', new mongoose.Schema({ removed: Boolean }));
const Activities = mongoose.model('Activities', new mongoose.Schema({ 'data.planned': Boolean, removed: Boolean }));
const Checklist = mongoose.model('Checklist', new mongoose.Schema({ removed: Boolean }));

mongoose.connect(process.env.DATABASE || process.env.MONGODB_URI);

async function flushPlanning() {
    try {
        console.log('🗑️  Deleting ALL 15-Day Planning data...');

        // Delete PlannedWork
        const pwResult = await PlannedWork.deleteMany({});
        console.log(`✅ Deleted ${pwResult.deletedCount} planned work entries.`);

        // Delete Activities that were marked as planned
        const actResult = await Activities.deleteMany({ 'data.planned': true });
        console.log(`✅ Deleted ${actResult.deletedCount} planning-related activities.`);

        // Note: Checklist entries might have data, usually they are created during planning
        // but we might want to keep the checklist if the work actually started.
        // However, if the user wants to "delete it all" for the planning module, we'll wipe checklists too.
        const clResult = await Checklist.deleteMany({});
        console.log(`✅ Deleted ${clResult.deletedCount} checklist entries.`);

        console.log('✨ Planning database is now clean.');
        process.exit();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

flushPlanning();
