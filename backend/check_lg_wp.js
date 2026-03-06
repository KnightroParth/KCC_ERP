const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.DATABASE).then(async () => {
    const db = mongoose.connection.db;

    // Get both projects
    const projects = await db.collection('projects').find({
        name: { $regex: /lotus/i }
    }).toArray();
    console.log('Projects:');
    projects.forEach(p => console.log('  _id=' + p._id + ' code=' + p.projectCode + ' name=' + p.name));

    // Check Lotus Green's WP First Coat rates
    const lotusGreen = projects.find(p => /green/i.test(p.name));
    if (lotusGreen) {
        const greenId = String(lotusGreen._id);
        const fc = await db.collection('workrates').find({
            category: 'Water Proofing',
            subCategory: 'First Coat',
            removed: false,
            projectId: greenId
        }).toArray();

        console.log('\nLotus Green First Coat WP rates (' + fc.length + '):');
        fc.sort((a, b) => (a.buildingName || '').localeCompare(b.buildingName || ''));
        
        // Group unique building+unitType
        const seen = new Set();
        fc.forEach(r => {
            const k = (r.buildingName || 'null') + '|' + r.unitType;
            if (!seen.has(k)) {
                seen.add(k);
                console.log('  [' + r.buildingName + '] [' + r.unitType + '] rate=' + r.rate);
            }
        });
        
        // Check for wrong/duplicate rates
        // From image: Lotus Green correct First Coat rates
        // A1,A2,A3 - 1BHK: 2000
        // A1,A2,A3 - 2BHK: 2000  
        // C1,C2    - 1BHK: 2000, 2BHK: 2000, 3BHK: 2500
        // B1       - 2BHK: 2000, 3BHK: 2500

        console.log('\nAll Lotus Green WP rates (not just First Coat):');
        const allGreen = await db.collection('workrates').find({
            category: 'Water Proofing',
            removed: false,
            projectId: greenId
        }).toArray();
        console.log('Total:', allGreen.length);
        const seenAll = new Set();
        allGreen.forEach(r => {
            const k = (r.buildingName||'null') + '|' + r.unitType + '|' + r.subCategory;
            if (!seenAll.has(k)) {
                seenAll.add(k);
                console.log('  [' + r.buildingName + '][' + r.unitType + '] ' + r.subCategory + ' = ' + r.rate);
            }
        });
    }

    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
