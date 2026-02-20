const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
    try {
        await mongoose.connect(process.env.DATABASE);
        console.log('Connected to DB');

        require(path.join(__dirname, '..', 'src/models/appModels/Unit.js'));
        require(path.join(__dirname, '..', 'src/models/appModels/Project.js'));

        const Unit = mongoose.model('Unit');
        const Project = mongoose.model('Project');

        // Check projects
        const projects = await Project.find({ name: /Lotus Park/i }).lean();
        console.log('Projects found:', projects.map(p => ({ id: p._id, name: p.name, code: p.projectCode })));

        if (projects.length === 0) {
            console.log('No Lotus Park project found');
            process.exit(0);
        }

        const projectIds = projects.map(p => p._id);
        const projectCodes = projects.map(p => p.projectCode).filter(Boolean);

        console.log('Searching for units with IDs:', projectIds, 'OR Codes:', projectCodes);

        const projectQueries = projectIds.map(id => ({ projectId: id }));
        const codeQueries = projectCodes.map(code => ({ projectId: code }));

        const counts = await Unit.aggregate([
            {
                $match: {
                    $or: [...projectQueries, ...codeQueries]
                }
            },
            { $group: { _id: '$buildingName', count: { $sum: 1 }, sampleUnit: { $first: '$unitNumber' }, sampleFloor: { $first: '$floorNumber' } } },
            { $sort: { _id: 1 } }
        ]);

        console.log('Units per building:', JSON.stringify(counts, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
