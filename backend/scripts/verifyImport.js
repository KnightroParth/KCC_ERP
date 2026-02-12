require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Vendor = require('../src/models/appModels/Vendor');

mongoose.connect(process.env.DATABASE || process.env.MONGODB_URI);

async function listData() {
    try {
        const vendors = await Vendor.find({});
        console.log(`Found ${vendors.length} contractors in database:`);
        vendors.forEach((v, i) => {
            console.log(`${i + 1}. ${v.name} (${v.workType || 'No Work Type'})`);
        });
        process.exit();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

listData();
