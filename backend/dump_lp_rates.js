const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;

mongoose.connect(DATABASE).then(async () => {
    const db = mongoose.connection.db;
    const lp = await db.collection('projects').findOne({ name: /Lotus Park/i });
    if (!lp) { console.error('Lotus Park not found'); process.exit(1); }

    const rates = await db.collection('workrates').find({
        projectId: lp._id,
        category: 'Mivan'
    }).toArray();

    // Grouping by building to see what we have
    const summary = {};
    rates.forEach(r => {
        const key = `${r.buildingName || 'NoBuilding'}-${r.unitType || 'NoType'}`;
        if (!summary[key]) summary[key] = [];
        summary[key].push({ subCategory: r.subCategory, rate: r.rate });
    });

    fs.writeFileSync('lp_mivan_debug.json', JSON.stringify({
        projectId: lp._id,
        projectCode: lp.projectCode,
        totalRates: rates.length,
        summary: summary,
        raw_first_5: rates.slice(0, 5)
    }, null, 2));

    console.log(`Lotus Park rates dumped to lp_mivan_debug.json. Total: ${rates.length}`);
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
