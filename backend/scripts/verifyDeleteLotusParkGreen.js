/**
 * Verification script: Check counts for verification.
 * Run: node scripts/verifyDeleteLotusParkGreen.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const MONGO_URI = process.env.DATABASE || process.env.MONGODB_URI;

async function main() {
    await mongoose.connect(MONGO_URI);
    const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }), 'projects');
    const PlannedWork = mongoose.model('PlannedWork', new mongoose.Schema({}, { strict: false }), 'plannedworks');
    const Activity = mongoose.model('Activity', new mongoose.Schema({}, { strict: false }), 'activities');

    const all = await Project.find({ removed: { $ne: true } }).lean();
    const lp = all.filter(p => /lotus\s*park/i.test(p.name));
    const lg = all.filter(p => /lotus\s*green/i.test(p.name));
    const lh = all.filter(p => /lotus\s*height/i.test(p.name));

    console.log('\n=== Lotus Projects ===');
    [...lg, ...lp, ...lh].forEach(p => console.log(` - "${p.name}" | _id: ${p._id} | code: ${p.projectCode}`));

    const deletedIds = [...lg, ...lp].map(p => p._id);
    const deletedCodes = [...lg, ...lp].map(p => p.projectCode).filter(Boolean);
    const safeIds = lh.map(p => p._id);
    const safeCodes = lh.map(p => p.projectCode).filter(Boolean);

    const pwLGLP = await PlannedWork.countDocuments({ $or: [{ projectId: { $in: deletedIds } }, { projectId: { $in: deletedCodes } }] });
    const actLGLP = await Activity.countDocuments({ $or: [{ projectId: { $in: deletedIds } }, { projectId: { $in: deletedCodes } }] });
    const pwLH = await PlannedWork.countDocuments({ $or: [{ projectId: { $in: safeIds } }, { projectId: { $in: safeCodes } }] });
    const actLH = await Activity.countDocuments({ $or: [{ projectId: { $in: safeIds } }, { projectId: { $in: safeCodes } }] });

    console.log('\n=== Lotus Green + Lotus Park ===');
    console.log(` PlannedWork remaining: ${pwLGLP}  (should be 0)`);
    console.log(` Activities remaining:  ${actLGLP}  (should be 0)`);
    console.log('\n=== Lotus Heights (should be intact) ===');
    console.log(` PlannedWork remaining: ${pwLH}`);
    console.log(` Activities remaining:  ${actLH}`);

    await mongoose.disconnect();
}
main().catch(err => { console.error(err); process.exit(1); });
