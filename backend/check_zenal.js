const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
require('dotenv').config();

const vendorId = '698c56ae5e1a526b965b0369'; // Syed Zenal Waterprofing

mongoose.connect(process.env.DATABASE).then(async () => {
    const db = mongoose.connection.db;

    const rates = await db.collection('workrates').find({
        category: 'Water Proofing',
        contractorId: new ObjectId(vendorId),
        removed: false
    }).toArray();

    console.log('WP rates for Syed Zenal Waterprofing:', rates.length);

    // Group by buildingName + unitType + subCategory
    const seen = new Set();
    const uniq = [];
    rates.forEach(r => {
        const k = r.buildingName + '|' + r.unitType + '|' + r.subCategory;
        if (!seen.has(k)) { seen.add(k); uniq.push(r); }
    });
    uniq.sort((a, b) =>
        (a.buildingName || '').localeCompare(b.buildingName || '') ||
        (a.unitType || '').localeCompare(b.unitType || '') ||
        (a.subCategory || '').localeCompare(b.subCategory || '')
    );
    uniq.forEach(r => {
        console.log('[' + r.buildingName + '] [' + r.unitType + '] [fl:' + r.minFloor + '-' + r.maxFloor + '] ' + r.subCategory + ' = ' + r.rate);
    });

    // Specifically show First Coat rates
    const fc = rates.filter(r => r.subCategory === 'First Coat');
    console.log('\nFirst Coat rates (' + fc.length + ' entries):');
    const fcSeen = new Set();
    fc.forEach(r => {
        const k = r.buildingName + '|' + r.unitType;
        if (!fcSeen.has(k)) {
            fcSeen.add(k);
            console.log('  [' + r.buildingName + '] [' + r.unitType + '] rate=' + r.rate + ' (unitNum=' + r.unitNumber + ')');
        }
    });

    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
