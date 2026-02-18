const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbLine = envContent.split('\n').find(line => line.startsWith('DATABASE='));
const DATABASE = dbLine ? dbLine.split('=')[1].trim() : null;

if (!DATABASE) {
    console.error('DATABASE not found in .env');
    process.exit(1);
}

mongoose.connect(DATABASE).then(async () => {
    const db = mongoose.connection.db;
    const projects = await db.collection('projects').find({}).project({ name: 1 }).toArray();
    console.log('--- PROJECT NAMES IN DB (with quotes) ---');
    projects.forEach(p => console.log(`"${p.name}"`));
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
