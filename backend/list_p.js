const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const DATABASE = process.env.DATABASE || process.env.MONGODB_URI;

if (!DATABASE) {
    console.error('DATABASE not found');
    process.exit(1);
}

mongoose.connect(DATABASE).then(async () => {
    const db = mongoose.connection.db;
    const projects = await db.collection('projects').find({}).project({ name: 1 }).toArray();
    console.log('--- DB PROJECTS ---');
    projects.forEach(p => console.log(`|${p.name}|`));
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
