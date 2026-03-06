const mongoose = require('mongoose');
require('dotenv').config();

const PROJECT_MONGO_ID = '69970bf599f31c44259ff756'; // Lotus Park _id

mongoose.connect(process.env.DATABASE).then(async () => {
    const db = mongoose.connection.db;

    // Simulate exactly what workRateController.listAll does
    // It builds: query.projectId = { $in: [ObjectId, stringId, projectCode, ...] }
    const { ObjectId } = mongoose.Types;
    
    const codes = [
        new ObjectId(PROJECT_MONGO_ID),   // ObjectId form
        PROJECT_MONGO_ID,                  // string form
        'KCC-2026-001',                   // projectCode
    ];

    console.log('Query codes:', codes);

    const results = await db.collection('workrates').find({
        removed: false,
        projectId: { $in: codes },
        category: 'Water Proofing',
        subCategory: 'First Coat'
    }).toArray();

    console.log('First Coat WP rates returned by listAll-style query:', results.length);
    results.forEach(r => {
        console.log('  [' + r.buildingName + '] [' + r.unitType + '] rate=' + r.rate + ' projectId type=' + typeof r.projectId + ' val=' + r.projectId);
    });

    // Also check: does the frontend actually call with projectId param right?
    // The SetRate fetchRates sends: options: { projectId: project._id.toString() }
    // Double check what project._id is
    const lp = await db.collection('projects').findOne({ name: /Lotus Park/i });
    console.log('\nLotus Park _id:', lp._id, 'type:', typeof lp._id);
    console.log('Lotus Park _id.toString():', lp._id.toString());

    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
