const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;

mongoose.connect(DATABASE).then(async () => {
    const db = mongoose.connection.db;

    const lp = await db.collection('projects').findOne({ name: /Lotus Park/i });
    if (!lp) { console.error('Lotus Park not found'); process.exit(1); }

    console.log(`Checking rates for Lotus Park (_id: ${lp._id})`);

    const rates = await db.collection('workrates').find({
        projectId: lp._id,
        category: 'Mivan',
        subCategory: /Mivan Centering/i
    }).toArray();

    rates.forEach(r => {
        console.log(`Building: ${r.buildingName}, UnitType: ${r.unitType}, Floors: ${r.minFloor}-${r.maxFloor}, Rate: ${r.rate}`);
    });

    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
