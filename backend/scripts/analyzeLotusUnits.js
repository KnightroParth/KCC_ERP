const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

const Unit = mongoose.model('Unit', new mongoose.Schema({ unitNumber: String, buildingName: String, towerOrWing: String, unitType: String, projectId: mongoose.Schema.Types.Mixed }));

mongoose.connect(process.env.DATABASE || process.env.MONGODB_URI);

async function analyzeUnits() {
    try {
        const units = await Unit.find({ projectId: 'KCC-2026-001' });
        console.log('Total Units:', units.length);

        const buildings = {};
        const unitTypes = {};
        const combinations = {};

        units.forEach(u => {
            const b = u.buildingName || u.towerOrWing || 'N/A';
            const t = u.unitType || 'N/A';

            buildings[b] = (buildings[b] || 0) + 1;
            unitTypes[t] = (unitTypes[t] || 0) + 1;

            const combo = `${b} | ${t}`;
            combinations[combo] = (combinations[combo] || 0) + 1;
        });

        console.log('Buildings:', buildings);
        console.log('Unit Types:', unitTypes);
        console.log('Combinations:', combinations);

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

analyzeUnits();
