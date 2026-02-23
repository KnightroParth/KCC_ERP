const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;

mongoose.connect(DATABASE).then(async () => {
    const db = mongoose.connection.db;
    const lp = await db.collection('projects').findOne({ name: /Lotus Park/i });
    if (!lp) { console.error('Lotus Park not found'); process.exit(1); }

    const allRates = await db.collection('workrates').find({
        $or: [
            { projectId: lp._id },
            { projectId: String(lp._id) },
            { projectId: lp.projectCode },
            { projectId: 'Lotus Park' }
        ],
        removed: false
    }).toArray();

    const report = {
        meta: {
            lp_id: lp._id,
            lp_code: lp.projectCode,
            total_rates: allRates.length,
            per_flat_count: allRates.filter(r => r.unitNumber).length,
            rule_count: allRates.filter(r => !r.unitNumber).length
        },
        per_flat_sample: allRates.filter(r => r.unitNumber).slice(0, 10),
        rule_sample: allRates.filter(r => !r.unitNumber).filter(r => r.category === 'Mivan').slice(0, 10)
    };

    fs.writeFileSync('lp_rates_report.json', JSON.stringify(report, null, 2));
    console.log('Report written to lp_rates_report.json');
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
