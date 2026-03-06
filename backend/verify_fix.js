const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.DATABASE).then(async () => {
    const db = mongoose.connection.db;

    console.log('Connected to DB:', mongoose.connection.host, '/', mongoose.connection.name);

    // Check what .env says
    console.log('DATABASE env:', process.env.DATABASE?.replace(/:([^:@]+)@/, ':****@'));

    // Verify our fix was actually applied
    const fc = await db.collection('workrates').find({
        category: 'Water Proofing',
        subCategory: 'First Coat',
        removed: false,
        buildingName: { $in: ['A1', 'A2'] }
    }).toArray();

    console.log('\nCurrent First Coat rates for A1/A2 (should be 1800/2500 only):');
    fc.forEach(r => console.log('  [' + r.buildingName + '] [' + r.unitType + '] rate=' + r.rate + ' projectId=' + r.projectId));

    // Check what projectId Lotus Park has
    const projects = await db.collection('projects').find({
        name: { $regex: /lotus park/i }
    }).toArray();
    console.log('\nLotus Park projects:');
    projects.forEach(p => console.log('  _id=' + p._id + ' code=' + p.projectCode + ' name=' + p.name));

    // Now check if workrates have matching projectId
    const projectIds = projects.map(p => [String(p._id), p.projectCode, p.projectId].filter(Boolean)).flat();
    console.log('\nSearching for WP rates with these projectIds:', projectIds);

    const ratesWithPid = await db.collection('workrates').find({
        category: 'Water Proofing',
        projectId: { $in: projectIds }
    }).toArray();
    console.log('WP rates with matching projectId:', ratesWithPid.length);

    // Check what projectIds are actually on WP rates
    const allWP = await db.collection('workrates').find({ category: 'Water Proofing', removed: false }).limit(5).toArray();
    console.log('\nSample WP rate projectIds:');
    allWP.forEach(r => console.log('  projectId=' + JSON.stringify(r.projectId) + ' type=' + typeof r.projectId));

    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
