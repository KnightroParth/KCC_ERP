const mongoose = require('mongoose');
require('dotenv').config();

async function fixPurchaseOrderIndexes() {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log('🔌 Connected to MongoDB...');

    const collection = mongoose.connection.collection('purchaseorders');
    
    // List current indexes
    const indexes = await collection.indexes();
    console.log('🔍 Current Indexes:', indexes.map(i => ({ name: i.name, key: i.key })));

    // Drop the old single-field index on 'number' if it exists
    try {
      await collection.dropIndex('number_1');
      console.log('✅ Dropped old index: number_1');
    } catch (e) {
      if (e.code === 27 || e.message.includes('index not found')) {
        console.log('ℹ️ Index number_1 does not exist (that is fine).');
      } else {
        console.log('ℹ️ Could not drop number_1:', e.message);
      }
    }

    // Check for duplicate number/year combinations
    const duplicates = await collection.aggregate([
      { $match: { number: { $exists: true }, year: { $exists: true } } },
      { $group: { _id: { number: '$number', year: '$year' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate number/year combinations:');
      duplicates.forEach(dup => {
        console.log(`   Number: ${dup._id.number}, Year: ${dup._id.year}, Count: ${dup.count}`);
      });
      console.log('   Fixing duplicates by regenerating numbers...');
      
      // Fix duplicates by regenerating numbers for the duplicates (keep the first one)
      for (const dup of duplicates) {
        const docs = await collection.find({ number: dup._id.number, year: dup._id.year }).toArray();
        // Keep the first document, regenerate numbers for the rest
        for (let i = 1; i < docs.length; i++) {
          const year = dup._id.year;
          const maxDoc = await collection.findOne({ year: year }, { sort: { number: -1 } });
          const newNumber = maxDoc && maxDoc.number ? maxDoc.number + 1 : dup._id.number + 1;
          
          await collection.updateOne(
            { _id: docs[i]._id },
            { $set: { number: newNumber } }
          );
          console.log(`   ✅ Fixed duplicate: Updated document ${docs[i]._id} to number ${newNumber}`);
        }
      }
    }

    // Drop the existing compound index if it exists (it might not be unique)
    try {
      await collection.dropIndex('number_1_year_1');
      console.log('✅ Dropped existing compound index: number_1_year_1');
    } catch (e) {
      if (e.code === 27 || e.message.includes('index not found')) {
        console.log('ℹ️ Index number_1_year_1 does not exist (that is fine).');
      } else {
        console.log('ℹ️ Could not drop number_1_year_1:', e.message);
      }
    }

    // Create the compound unique index
    try {
      await collection.createIndex({ number: 1, year: 1 }, { unique: true, name: 'number_1_year_1' });
      console.log('✅ Created compound unique index: number_1_year_1');
    } catch (e) {
      if (e.code === 85) {
        console.log('❌ Error: Cannot create unique index due to duplicate data.');
        console.log('   Please run the script again to fix remaining duplicates.');
        throw e;
      } else {
        throw e;
      }
    }

    // List final indexes
    const finalIndexes = await collection.indexes();
    console.log('🔍 Final Indexes:', finalIndexes.map(i => ({ name: i.name, key: i.key })));
    console.log('✅ Purchase Order indexes fixed! You can now create purchase orders.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

fixPurchaseOrderIndexes();
