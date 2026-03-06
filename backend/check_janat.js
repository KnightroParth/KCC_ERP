const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
require('dotenv').config();

mongoose.connect(process.env.DATABASE).then(async () => {
    const db = mongoose.connection.db;

    // First find Syed Janat vendor
    const vendor = await db.collection('vendors').findOne({ name: { $regex: /syed janat/i } });
    console.log('Vendor found:', vendor ? vendor.name + ' id=' + vendor._id : 'NOT FOUND');

    if (!vendor) {
        // List all vendors to help identify
        const allVendors = await db.collection('vendors').find({}).project({ name: 1 }).toArray();
        console.log('All vendors:', allVendors.map(v => v.name + ' (' + v._id + ')').join('\n'));
        process.exit(0);
    }

    // Now get all WP rates with this contractor
    const rates = await db.collection('workrates').find({
        category: 'Water Proofing',
        contractorId: vendor._id,
        removed: false
    }).toArray();

    console.log('\nWP rates for', vendor.name, ':', rates.length, 'total');
    rates.forEach(r => {
        console.log('  [' + r.buildingName + '] [' + r.unitType + '] [fl:' + r.minFloor + '-' + r.maxFloor + '] ' + r.subCategory + ' = ' + r.rate + ' (unit=' + r.unitNumber + ')');
    });

    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
