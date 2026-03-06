const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.DATABASE).then(async () => {
    const db = mongoose.connection.db;

    // Get ALL WP rates, show everything about First Coat
    const allWP = await db.collection('workrates').find({
        category: 'Water Proofing',
        removed: false
    }).toArray();

    const fc = allWP.filter(r => {
        const sub = String(r.subCategory || '').toLowerCase().trim();
        return sub.includes('first coat');
    });

    console.log('ALL First Coat WP rates (', fc.length, '):');
    const normalized = (b) => (b ? String(b).replace(/[\s-]/g, '').toUpperCase() : 'NULL');

    fc.sort((a, b) => normalized(a.buildingName).localeCompare(normalized(b.buildingName)));
    fc.forEach(r => {
        console.log(
            'building=' + JSON.stringify(r.buildingName) +
            ' unitType=' + JSON.stringify(r.unitType) +
            ' unitNum=' + JSON.stringify(r.unitNumber) +
            ' floor=' + r.minFloor + '-' + r.maxFloor +
            ' rate=' + r.rate +
            ' subCat=' + JSON.stringify(r.subCategory)
        );
    });

    // Check if there are any WP rates that would match A1 units and have rate=500
    console.log('\n---  Rates that could appear as 500 for A1 ---');
    const candidates500 = allWP.filter(r => r.rate === 500);
    console.log('All WP rates with rate=500:', candidates500.length);
    candidates500.forEach(r => {
        console.log('  subCat=' + r.subCategory + ' building=' + r.buildingName + ' unitType=' + r.unitType + ' unitNum=' + r.unitNumber);
    });

    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
