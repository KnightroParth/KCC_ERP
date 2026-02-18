const mongoose = require('mongoose');
require('dotenv').config();

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;

mongoose.connect(DATABASE).then(async () => {
    const db = mongoose.connection.db;
    const rate = await db.collection('workrates').findOne({ category: 'Mivan' });
    if (rate) {
        console.log(`Category: [${rate.category}]`);
        console.log(`SubCategory: [${rate.subCategory}]`);
        console.log(`BuildingName: [${rate.buildingName}]`);
        console.log(`UnitType: [${rate.unitType}]`);
    } else {
        console.log('No Mivan rates found');
    }
    process.exit(0);
});
