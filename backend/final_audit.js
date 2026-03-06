const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.DATABASE).then(async () => {
    const db = mongoose.connection.db;

    const projects = {
        'Lotus Park':  '69970bf599f31c44259ff756',
        'Lotus Green': '69970bf599f31c44259ff758',
    };

    // Expected First Coat rates from Excel image
    const LP_EXPECTED = {  // Lotus Park
        'A1|1 BHK': 1800, 'A1|2 BHK': 2500,
        'A2|1 BHK': 1800, 'A2|2 BHK': 2500,
        'A3|1 BHK': 2000, 'A3|2 BHK': 2500,
    };
    const LG_EXPECTED = {  // Lotus Green
        'A1|1 BHK': 2000, 'A1|2 BHK': 2000,
        'A2|1 BHK': 2000, 'A2|2 BHK': 2000,
        'A3|1 BHK': 2000, 'A3|2 BHK': 2000,
        'B1|2 BHK': 2000, 'B1|3 BHK': 2500,
        'C1|1 BHK': 2000, 'C1|2 BHK': 2000, 'C1|3 BHK': 2500,
        'C2|1 BHK': 2000, 'C2|2 BHK': 2000, 'C2|3 BHK': 2500,
    };

    for (const [name, pid] of Object.entries(projects)) {
        const fc = await db.collection('workrates').find({
            category: 'Water Proofing',
            subCategory: 'First Coat',
            removed: false,
            projectId: pid
        }).toArray();

        const expected = name === 'Lotus Park' ? LP_EXPECTED : LG_EXPECTED;
        console.log('\n=== ' + name + ' (' + pid + ') ===');
        console.log('First Coat records found:', fc.length, '| Expected unique:', Object.keys(expected).length);

        // Check each expected key
        Object.entries(expected).forEach(([key, correctRate]) => {
            const [bldg, utype] = key.split('|');
            const match = fc.find(r => r.buildingName === bldg && r.unitType === utype);
            if (!match) {
                console.log('  ❌ MISSING: [' + bldg + '][' + utype + '] expected=' + correctRate);
            } else if (match.rate !== correctRate) {
                console.log('  ❌ WRONG:   [' + bldg + '][' + utype + '] got=' + match.rate + ' expected=' + correctRate);
            } else {
                console.log('  ✅ OK:      [' + bldg + '][' + utype + '] rate=' + match.rate);
            }
        });
    }

    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
