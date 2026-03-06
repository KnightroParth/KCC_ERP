const mongoose = require('mongoose');
require('dotenv').config();

const vendorId = '698c56ae5e1a526b965b0369'; // Syed Zenal Waterprofing

mongoose.connect(process.env.DATABASE).then(async () => {
    const db = mongoose.connection.db;

    // Try fetching with string contractorId
    const byString = await db.collection('workrates').find({
        category: 'Water Proofing',
        contractorId: vendorId,   // stored as plain string
        removed: false
    }).toArray();
    console.log('Rates with string contractorId:', byString.length);

    // Also check ALL WP rates and print contractorId type/value
    const allWP = await db.collection('workrates').find({
        category: 'Water Proofing',
        removed: false
    }).toArray();

    console.log('\nAll WP rates total:', allWP.length);
    const cids = {};
    allWP.forEach(r => {
        const cid = r.contractorId == null ? 'NULL' : String(r.contractorId);
        cids[cid] = (cids[cid] || 0) + 1;
    });
    console.log('ContractorId distribution:', JSON.stringify(cids, null, 2));

    // Show any rate with First Coat and non-null contractorId
    const fcWithContractor = allWP.filter(r => r.subCategory === 'First Coat' && r.contractorId != null);
    console.log('\nFirst Coat with contractorId set:', fcWithContractor.length);
    fcWithContractor.forEach(r => {
        console.log('  [' + r.buildingName + '] [' + r.unitType + '] cid=' + r.contractorId + ' rate=' + r.rate);
    });

    // Actually fetch ALL rates from the workrates collection for Syed Zenal by any method
    const anyZenal = allWP.filter(r => r.contractorId && String(r.contractorId).includes('698c56ae5e1a526b965b0369'));
    console.log('\nAny WP rate with Zenal contractorId (string contains):', anyZenal.length);

    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
