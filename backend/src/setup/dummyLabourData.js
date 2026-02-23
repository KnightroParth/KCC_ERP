require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }); // Fix path to .env
const mongoose = require('mongoose');

// Fix Model paths relative to src/setup/
const LabourMaster = require('../models/appModels/LabourMaster');
const Project = require('../models/appModels/Project');

async function createDummyLabourData() {
  try {
    const projects = await Project.find({ removed: false }).limit(2);
    
    if (projects.length === 0) {
      console.log('⚠️  No projects found. Please create at least one project first.');
      return;
    }

    const project1 = projects[0];
    const project2 = projects[1] || projects[0];

    const labours = [
      {
        name: 'Chetan Chincholkar',
        trade: 'Electrician',
        labourType: 'Mistri',
        vendorType: 'Vendor Labour',
        projectId: project1._id,
        status: 'Active',
      },
      {
        name: 'Mahesh Patil',
        trade: 'Mason',
        labourType: 'Mistri',
        vendorType: 'My Labour',
        projectId: project2._id,
        status: 'Active',
      },
      {
        name: 'Ganesh Jadhav',
        trade: 'Helper',
        labourType: 'Helper',
        vendorType: 'Vendor Labour',
        projectId: project1._id,
        status: 'Active',
      },
    ];

    for (const labourData of labours) {
      const existing = await LabourMaster.findOne({
        name: labourData.name,
        trade: labourData.trade,
        projectId: labourData.projectId,
      });

      if (!existing) {
        await LabourMaster.create(labourData);
        console.log(`✅ Created labour: ${labourData.name}`);
      } else {
        console.log(`⏭️  Skipped: ${labourData.name}`);
      }
    }

    console.log('✅ Dummy labour data setup completed!');
  } catch (error) {
    console.error('❌ Error creating dummy labour data:', error.message);
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE || 'mongodb://localhost:27017/kcc_erp';
  
  mongoose
    .connect(MONGODB_URI) // removed deprecated options
    .then(() => {
      console.log('✅ Connected to MongoDB');
      return createDummyLabourData();
    })
    .then(() => {
      mongoose.connection.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = createDummyLabourData;