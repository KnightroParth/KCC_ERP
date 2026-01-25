const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

require('../src/models/appModels/Project');
require('../src/models/appModels/Units');

const Project = mongoose.model('Project');
const Units = mongoose.model('Units');

(async () => {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log('✅ Connected to MongoDB\n');

    const project = await Project.findOne({ name: 'Lotus Park' });
    if (!project) {
      console.error('❌ Project not found');
      process.exit(1);
    }

    const units = await Units.find({
      projectId: project.projectCode || project.projectId,
      removed: { $ne: true }
    }).limit(5).lean();

    console.log(`📋 Sample units for Lotus Park (showing first 5):\n`);
    units.forEach((unit, idx) => {
      console.log(`Unit ${idx + 1}:`);
      console.log(`  - Unit Number: ${unit.unitNumber}`);
      console.log(`  - Wing: ${unit.towerOrWing}`);
      console.log(`  - Floor: ${unit.floor}`);
      console.log(`  - floorNumber: ${unit.floorNumber}`);
      console.log(`  - Carpet Area: ${unit.carpetArea}`);
      console.log(`  - saleableArea: ${unit.saleableArea}`);
      console.log(`  - areaSqft: ${unit.areaSqft}`);
      console.log(`  - ownerName: ${unit.ownerName || 'N/A'}`);
      console.log('');
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
