require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE);

const run = async () => {
  try {
    console.log('🔌 Connected to DB...');
    const collection = mongoose.connection.collection('attendancerecords');

    // List current indexes
    const indexes = await collection.indexes();
    console.log('🔍 Found Indexes:', indexes.map(i => i.name));

    // Drop all indexes except the default _id
    await collection.dropIndexes();
    console.log('✅ All old indexes dropped! Restart your backend to rebuild them correctly.');

  } catch (e) {
    console.log('❌ Error:', e.message);
  } finally {
    process.exit();
  }
};

run();