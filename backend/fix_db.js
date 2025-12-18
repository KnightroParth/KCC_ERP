require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log('🔌 Connected to MongoDB...');

    const collection = mongoose.connection.collection('attendancerecords');
    
    // 1. Drop ALL Indexes to clear old rules
    try {
      await collection.dropIndexes();
      console.log('✅ Old Indexes Dropped!');
    } catch (e) {
      console.log('ℹ️ No indexes to drop (that is fine).');
    }

    // 2. Re-Define the Schema to create NEW Correct Indexes
    const schema = new mongoose.Schema({
      projectId: { type: mongoose.Schema.Types.ObjectId, required: true },
      date: { type: Date, required: true },
      vendorId: { type: mongoose.Schema.Types.ObjectId }, // Vendor
      labourId: { type: mongoose.Schema.Types.ObjectId }, // Staff
      attendanceType: { type: String, enum: ['Individual', 'Group'] },
      removed: { type: Boolean, default: false }
    });

    // RULE 1: Staff - One record per Staff per Day
    schema.index(
      { labourId: 1, date: 1 }, 
      { unique: true, partialFilterExpression: { attendanceType: 'Individual', removed: false } }
    );

    // RULE 2: Vendor - One record per VENDOR per Project per Day
    schema.index(
      { vendorId: 1, projectId: 1, date: 1 }, 
      { unique: true, partialFilterExpression: { attendanceType: 'Group', removed: false } }
    );

    const Model = mongoose.model('AttendanceRecord_Fix', schema, 'attendancerecords');
    
    // 3. Force Build Indexes
    await Model.init();
    console.log('🚀 New Correct Indexes Built!');
    console.log('✅ FIXED! You can now save multiple vendors on the same day.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

fixIndexes();