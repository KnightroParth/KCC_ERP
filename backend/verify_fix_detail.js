const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;

mongoose.connect(DATABASE).then(async () => {
    const db = mongoose.connection.db;
    const lp = await db.collection('projects').findOne({ name: /Lotus Park/i });
    if (!lp) { console.error('Lotus Park not found'); process.exit(1); }

    console.log(`Checking specific rates for Lotus Park Unit 113...`);

    const specificRates = await db.collection('workrates').find({
        projectId: lp._id,
        unitNumber: '113'
    }).toArray();

    console.log(`Found ${specificRates.length} specific rates for Unit 113. (Should be 0)`);
    if (specificRates.length > 0) {
        console.log('SPECIFIC RATES:', JSON.stringify(specificRates, null, 2));
    }

    console.log(`\nChecking rule rates for Mivan/Building A1...`);
    const ruleA1 = await db.collection('workrates').find({
        projectId: lp._id,
        category: 'Mivan',
        subCategory: 'Mivan Centering',
        buildingName: 'A1',
        unitNumber: null
    }).toArray();

    console.log(`Found ${ruleA1.length} rules for Building A1. (Should be > 0 if A1 was in A1,A2)`);
    ruleA1.forEach(r => {
        console.log(`Rule: unitType=${r.unitType}, rate=${r.rate}`);
    });

    console.log(`\nChecking building matching logic simulation...`);
    const normalize = (s) => (s ? String(s).replace(/[\s-]/g, '').toUpperCase() : '');

    // Test match logic
    const unitBuilding = 'A-1'; // from my previous units search
    const unitBuildingNorm = normalize(unitBuilding);
    console.log(`Unit Building Norm: ${unitBuildingNorm}`);

    for (const r of ruleA1) {
        const rNorm = normalize(r.buildingName);
        console.log(`Rule Building: ${r.buildingName}, Norm: ${rNorm}, Matches: ${rNorm === unitBuildingNorm}`);
    }

    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
