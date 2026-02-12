const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

require('../src/models/appModels/WorkRate');
const WorkRate = mongoose.model('WorkRate');

mongoose.connect(process.env.DATABASE || process.env.MONGODB_URI);

async function verifyRates() {
    try {
        const count = await WorkRate.countDocuments({});
        console.log('Total WorkRate documents:', count);

        const samples = await WorkRate.find({}).limit(10);
        console.log('Sample Data:');
        samples.forEach(s => {
            console.log(`Cat: ${s.category}, Task: ${s.subCategory}, Type: ${s.unitType}, Bldg: ${s.buildingPattern}, Floors: ${s.minFloor}-${s.maxFloor}, Rate: ${s.rate}`);
        });

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verifyRates();
