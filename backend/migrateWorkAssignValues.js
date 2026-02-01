/**
 * Migration Script: Convert WorkAssign values from Object to Array
 * 
 * This script helps migrate existing WorkAssign documents that may have
 * values stored as Objects to the new Array format.
 * 
 * Usage: node migrateWorkAssignValues.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const WorkAssign = require("./src/models/appModels/WorkAssign");

async function migrateWorkAssignValues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🔗 Connected to MongoDB");

    // Find all non-removed WorkAssign documents
    const workAssigns = await WorkAssign.find({ removed: { $ne: true } });
    console.log(`📌 Total WorkAssign documents found: ${workAssigns.length}`);

    let migratedCount = 0;

    for (const workAssign of workAssigns) {
      const { _id, values } = workAssign;

      // Check if values is an Object (not Array)
      if (values && typeof values === 'object' && !Array.isArray(values)) {
        try {
          // Convert Object to Array
          // If values is an object like { task1: true, task2: true }, 
          // convert to array of keys: ['task1', 'task2']
          const valueKeys = Object.keys(values);
          
          await WorkAssign.updateOne(
            { _id },
            { values: valueKeys }
          );

          console.log(`✅ Migrated WorkAssign ${_id}: ${JSON.stringify(values)} → ${JSON.stringify(valueKeys)}`);
          migratedCount++;
        } catch (error) {
          console.error(`❌ Error migrating WorkAssign ${_id}: ${error.message}`);
        }
      }
    }

    console.log(`\n🎯 Migration completed successfully`);
    console.log(`📊 Total documents migrated: ${migratedCount}/${workAssigns.length}`);
    process.exit();
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrateWorkAssignValues();
