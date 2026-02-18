const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;

mongoose.connect(DATABASE).then(async () => {
    const db = mongoose.connection.db;

    const projects = await db.collection('projects').find({
        name: { $in: [/Lotus Park/i, /Lotus Green/i] }
    }).toArray();

    console.log('Projects found:', projects.map(p => p.name));

    for (const project of projects) {
        const count = await db.collection('workrates').countDocuments({ projectId: project._id });
        console.log(`Project ${project.name} has ${count} workrates`);

        if (count > 0) {
            const sample = await db.collection('workrates').find({ projectId: project._id }).limit(1).toArray();
            console.log(`Sample for ${project.name}:`, JSON.stringify(sample[0], null, 2));
        }
    }
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
