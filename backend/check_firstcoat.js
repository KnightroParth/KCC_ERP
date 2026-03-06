const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.DATABASE).then(async () => {
    const db = mongoose.connection.db;

    // Get all WP First Coat rates
    const rates = await db.collection('workrates').find({
        category: 'Water Proofing',
        subCategory: 'First Coat',
        removed: false
    }).toArray();

    console.log('Total First Coat WP rates:', rates.length);

    // Group by contractor
    const byContractor = {};
    rates.forEach(r => {
        const cid = r.contractorId ? String(r.contractorId) : 'NO_CONTRACTOR';
        if (!byContractor[cid]) byContractor[cid] = [];
        byContractor[cid].push(r);
    });

    for (const [cid, rs] of Object.entries(byContractor)) {
        console.log('\n--- contractorId:', cid, '(count:', rs.length, ') ---');
        rs.slice(0, 10).forEach(r => {
            console.log('  [' + r.buildingName + '] [' + r.unitType + '] [fl:' + r.minFloor + '-' + r.maxFloor + '] rate=' + r.rate + ' unitNum=' + r.unitNumber);
        });
        if (rs.length > 10) console.log('  ...and', rs.length - 10, 'more');
    }

    // Also look up contractor names
    const contractorIds = Object.keys(byContractor).filter(c => c !== 'NO_CONTRACTOR');
    if (contractorIds.length > 0) {
        const { ObjectId } = require('mongodb');
        const vendors = await db.collection('vendors').find({
            _id: { $in: contractorIds.map(id => { try { return new ObjectId(id); } catch(e) { return null; } }).filter(Boolean) }
        }).toArray();
        console.log('\nContractor names:');
        vendors.forEach(v => console.log(' ', String(v._id), '->', v.name));
    }

    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
