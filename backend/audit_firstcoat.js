const mongoose = require('mongoose');
require('dotenv').config();

// Correct rates from Excel image:
// A1, A2 - 1BHK: First Coat = 1800
// A1, A2 - 2BHK: First Coat = 2500
// A3      - 1BHK: First Coat = 2000
// A3      - 2BHK: First Coat = 2500
// B1      - 2BHK: First Coat = 2000
// B1      - 3BHK: First Coat = 2500
// C1, C2  - 1BHK: First Coat = 2000
// C1, C2  - 2BHK: First Coat = 2000
// C1, C2  - 3BHK: First Coat = 2500
// Duplex (Ground floor 0-0) - 2BHK: 2500
// Duplex (First floor 1-1 ) - 2BHK: 2500

mongoose.connect(process.env.DATABASE).then(async () => {
    const db = mongoose.connection.db;

    // All First Coat rates, no contractor filter
    const all = await db.collection('workrates').find({
        category: 'Water Proofing',
        subCategory: 'First Coat',
        removed: false
    }).toArray();

    console.log('Total First Coat rates:', all.length);
    console.log('\nAll unique combinations (building+unitType+floor range):');

    const seen = new Set();
    const uniq = [];
    all.forEach(r => {
        const k = (r.buildingName||'null') + '|' + r.unitType + '|' + r.minFloor + '-' + r.maxFloor + '|' + (r.unitNumber||'null');
        if (!seen.has(k)) { seen.add(k); uniq.push(r); }
    });
    uniq.sort((a,b)=>(a.buildingName||'').localeCompare(b.buildingName||'')||(a.unitType||'').localeCompare(b.unitType||''));
    uniq.forEach(r => {
        const correct = getCorrect(r.buildingName, r.unitType, r.minFloor);
        const wrong = correct !== null && r.rate !== correct;
        console.log((wrong ? '❌ WRONG' : '  OK   ') + ' [' + r.buildingName + '] [' + r.unitType + '] [fl:' + r.minFloor + '-' + r.maxFloor + '] rate=' + r.rate + (correct !== null ? ' (should be '+correct+')' : ''));
    });

    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });

function getCorrect(building, unitType, minFloor) {
    const b = String(building || '').trim();
    const u = String(unitType || '').trim().replace(/\s+/g,'');
    if (/A1|A2/.test(b) && /1BHK/.test(u)) return 1800;
    if (/A1|A2/.test(b) && /2BHK/.test(u)) return 2500;
    if (/A3/.test(b) && /1BHK/.test(u)) return 2000;
    if (/A3/.test(b) && /2BHK/.test(u)) return 2500;
    if (/B1/.test(b) && /2BHK/.test(u)) return 2000;
    if (/B1/.test(b) && /3BHK/.test(u)) return 2500;
    if (/C1|C2/.test(b) && /1BHK/.test(u)) return 2000;
    if (/C1|C2/.test(b) && /2BHK/.test(u)) return 2000;
    if (/C1|C2/.test(b) && /3BHK/.test(u)) return 2500;
    if (/Duplex/i.test(u)) return 2500;
    return null;
}
