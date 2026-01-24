require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

// Import Models
require('../src/models/appModels/Project');
require('../src/models/appModels/Units');

const Project = mongoose.model('Project');
const Unit = mongoose.model('Units');

const verifyData = async () => {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log('✅ Connected to MongoDB');

    // 1. Find the Project
    const project = await Project.findOne({ name: 'Lotus Height' });
    
    if (!project) {
      console.error('❌ ERROR: Project "Lotus Height" NOT FOUND in database!');
      process.exit(1);
    }

    console.log(`\n📍 Project Found: "${project.name}" (ID: ${project._id})`);

    // 2. Count Units linked to this ID
    const unitCount = await Unit.countDocuments({ project: project._id });
    console.log(`🔢 Units linked to this Project ID: ${unitCount}`);

    // 3. Sample a few units
    if (unitCount > 0) {
      const samples = await Unit.find({ project: project._id }).limit(3);
      console.log('\n🔍 Sample Units Data:');
      samples.forEach(u => {
        console.log(`   - Unit: ${u.unitNumber} | Wing: ${u.towerOrWing} | Status: ${u.status}`);
      });
    } else {
      console.warn('⚠️  Zero units found! Checking for orphaned units...');
      
      // Check if units exist but have no project link
      const orphaned = await Unit.countDocuments({ project: null });
      console.log(`   - Orphaned Units (No Project ID): ${orphaned}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

verifyData();