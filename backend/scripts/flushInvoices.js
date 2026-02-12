require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Invoice = require('../src/models/appModels/Invoice');

mongoose.connect(process.env.DATABASE);
mongoose.Promise = global.Promise;

async function flushData() {
  try {
    console.log('🗑️  Deleting ALL invoices/bills...');

    const result = await Invoice.deleteMany({});

    console.log(`✅ Deleted ${result.deletedCount} invoices.`);
    console.log('✨ Invoice database is now empty.');
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

flushData();
