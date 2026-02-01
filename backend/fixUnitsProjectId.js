require("dotenv").config();
const mongoose = require("mongoose");
const Units = require("./src/models/appModels/Units");
const Client = require("./src/models/appModels/Client");

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("🔗 Connected to MongoDB");

  const units = await Units.find();
  console.log("📌 Total Units:", units.length);

  for (const unit of units) {
    const projCode = unit.projectId; // <- currently stored as "KCC-2025-017"
    if (!projCode || projCode.length < 5) {
      console.log(`⚠ Unit ${unit.unitNumber} has invalid projectId: ${projCode}`);
      continue;
    }

    // find client whose projectCode matches the string
    const client = await Client.findOne({ projectCode: projCode, removed: { $ne: true } });

    if (!client) {
      console.log(`❌ No Client found for projectCode ${projCode} (Unit ${unit.unitNumber})`);
      continue;
    }

    // Now update projectId to valid ObjectId
    unit.projectId = client._id;
    await unit.save();
    console.log(`✅ Updated Unit ${unit.unitNumber} → projectId = ${client._id}`);
  }

  console.log("🎯 Migration completed successfully");
  process.exit();
}

fix();