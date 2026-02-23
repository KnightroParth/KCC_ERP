require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Supplier = require('../src/models/appModels/Supplier');

mongoose.connect(process.env.DATABASE);
mongoose.Promise = global.Promise;

async function flushData() {
  try {
    console.log('🗑️  Deleting ALL Suppliers...');
    
    // Delete everything in the Supplier collection
    const result = await Supplier.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} suppliers.`);
    console.log('✨ Supplier database is now empty and ready for new import.');
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

flushData();