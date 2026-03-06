const mongoose = require('mongoose');
require('dotenv').config();

// Lotus Green _id (from earlier query)
const LG_PROJECT_ID = '69970bf599f31c44259ff758';

// Correct First Coat rates for Lotus Green from Excel image
// A1,A2,A3 - 1BHK: 2000 | 2BHK: 2000
// B1        - 2BHK: 2000 | 3BHK: 2500
// C1,C2     - 1BHK: 2000 | 2BHK: 2000 | 3BHK: 2500
const MISSING_LG_FC = [
    { buildingName: 'A1', unitType: '1 BHK', rate: 2000 },
    { buildingName: 'A1', unitType: '2 BHK', rate: 2000 },
    { buildingName: 'A2', unitType: '1 BHK', rate: 2000 },
    { buildingName: 'A2', unitType: '2 BHK', rate: 2000 },
    { buildingName: 'A3', unitType: '2 BHK', rate: 2000 },  // A3 1BHK already has 2000, A3 2BHK is missing
];

mongoose.connect(process.env.DATABASE).then(async () => {
    const db = mongoose.connection.db;

    // First verify what's missing
    const existingFC = await db.collection('workrates').find({
        category: 'Water Proofing',
        subCategory: 'First Coat',
        removed: false,
        projectId: LG_PROJECT_ID
    }).toArray();

    console.log('Existing Lotus Green First Coat rates:');
    existingFC.forEach(r => console.log('  [' + r.buildingName + '][' + r.unitType + '] rate=' + r.rate));

    const existingKeys = new Set(existingFC.map(r => r.buildingName + '|' + r.unitType));
    
    // Insert only truly missing ones
    const toInsert = MISSING_LG_FC.filter(r => !existingKeys.has(r.buildingName + '|' + r.unitType));
    console.log('\nTo INSERT:', toInsert.length, 'records');
    toInsert.forEach(r => console.log('  [' + r.buildingName + '][' + r.unitType + '] rate=' + r.rate));

    if (toInsert.length > 0) {
        const docs = toInsert.map(r => ({
            projectId: LG_PROJECT_ID,
            category: 'Water Proofing',
            subCategory: 'First Coat',
            buildingName: r.buildingName,
            unitType: r.unitType,
            rate: r.rate,
            minFloor: 0,
            maxFloor: 100,
            removed: false,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        const result = await db.collection('workrates').insertMany(docs);
        console.log('\n✅ Inserted', result.insertedCount, 'records');
    }

    // Verify final state for Lotus Green
    const final = await db.collection('workrates').find({
        category: 'Water Proofing',
        subCategory: 'First Coat',
        removed: false,
        projectId: LG_PROJECT_ID
    }).toArray();
    
    console.log('\nFinal Lotus Green First Coat rates (' + final.length + '):');
    final.sort((a, b) => (a.buildingName || '').localeCompare(b.buildingName || ''));
    final.forEach(r => console.log('  [' + r.buildingName + '][' + r.unitType + '] rate=' + r.rate));

    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
