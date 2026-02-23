require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Vendor = require('../src/models/appModels/Vendor');

mongoose.connect(process.env.DATABASE || process.env.MONGODB_URI);
mongoose.Promise = global.Promise;

async function flushData() {
  try {
    console.log('🗑️  Deleting ALL Contractors (Vendors)...');
    
    // Delete everything in the Vendor collection
    const result = await Vendor.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} contractors.`);
    console.log('✨ Contractor database is now empty.');
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

flushData();
