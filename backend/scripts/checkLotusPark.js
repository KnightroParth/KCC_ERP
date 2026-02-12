const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

const Project = mongoose.model('Project', new mongoose.Schema({ name: String, projectCode: String }));
const Unit = mongoose.model('Unit', new mongoose.Schema({ unitNumber: String, buildingName: String, unitType: String, projectId: mongoose.Schema.Types.Mixed }));

mongoose.connect(process.env.DATABASE || process.env.MONGODB_URI);

async function checkProject() {
    try {
        const projects = await Project.find({});
        const lotusPark = projects.find(p => p.name.toLowerCase().includes('lotus park'));

        if (lotusPark) {
            console.log('Project:', lotusPark.name, 'Code:', lotusPark.projectCode, 'ID:', lotusPark._id);

            const unitsById = await Unit.find({ projectId: lotusPark._id });
            console.log('Units by ID:', unitsById.length);

            const unitsByCode = await Unit.find({ projectId: lotusPark.projectCode });
            console.log('Units by Code:', unitsByCode.length);

            const allUnits = await Unit.find({}).limit(10);
            console.log('Sample of all units (first 10):');
            allUnits.forEach(u => console.log(`Unit: ${u.unitNumber}, Building: ${u.buildingName}, Type: ${u.unitType}, ProjectId: ${u.projectId}`));
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkProject();
