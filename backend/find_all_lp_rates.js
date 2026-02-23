const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;

mongoose.connect(DATABASE).then(async () => {
    const db = mongoose.connection.db;
    const lp = await db.collection('projects').findOne({ name: /Lotus Park/i });
    if (!lp) { console.error('Lotus Park not found'); process.exit(1); }

    console.log(`Lotus Park ID: ${lp._id}`);
    console.log(`Lotus Park Code: ${lp.projectCode}`);

    const allRates = await db.collection('workrates').find({
        $or: [
            { projectId: lp._id },
            { projectId: String(lp._id) },
            { projectId: lp.projectCode },
            { projectId: 'Lotus Park' }
        ]
    }).toArray();

    console.log(`Total rates found for Lotus Park: ${allRates.length}`);

    const perFlatRates = allRates.filter(r => r.unitNumber);
    console.log(`Per-flat rates (have unitNumber): ${perFlatRates.length}`);

    if (perFlatRates.length > 0) {
        console.log('Sample per-flat rate:', JSON.stringify(perFlatRates[0], null, 2));
    }

    const ruleRates = allRates.filter(r => !r.unitNumber);
    console.log(`Rule rates (no unitNumber): ${ruleRates.length}`);
    if (ruleRates.length > 0) {
        const mivanA3 = ruleRates.find(r => r.category === 'Mivan' && r.subCategory === 'Mivan Centering' && r.buildingName === 'A3');
        console.log('Rule rate for Mivan Centering/A3:', JSON.stringify(mivanA3, null, 2));
    }

    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
