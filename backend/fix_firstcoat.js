const mongoose = require('mongoose');
require('dotenv').config();

// Correct First Coat rates from Excel image
const CORRECT_FC = {
    'A1|1 BHK': 1800,
    'A1|2 BHK': 2500,
    'A2|1 BHK': 1800,
    'A2|2 BHK': 2500,
    'A3|1 BHK': 2000,
    'A3|2 BHK': 2500,
    'B1|2 BHK': 2000,
    'B1|3 BHK': 2500,
    'C1|1 BHK': 2000,
    'C1|2 BHK': 2000,
    'C1|3 BHK': 2500,
    'C2|1 BHK': 2000,
    'C2|2 BHK': 2000,
    'C2|3 BHK': 2500,
};

mongoose.connect(process.env.DATABASE).then(async () => {
    const db = mongoose.connection.db;

    const allFC = await db.collection('workrates').find({
        category: 'Water Proofing',
        subCategory: 'First Coat',
        removed: false
    }).toArray();

    console.log('Total First Coat WP rates found:', allFC.length);

    // Group by building|unitType
    const byKey = {};
    allFC.forEach(r => {
        const k = (r.buildingName || 'NULL') + '|' + (r.unitType || 'NULL');
        if (!byKey[k]) byKey[k] = [];
        byKey[k].push(r);
    });

    let toDelete = [];
    let toUpdate = [];

    for (const [key, entries] of Object.entries(byKey)) {
        const [building, unitType] = key.split('|');

        // Duplex: set all to 2500
        if (unitType === 'Duplex') {
            entries.forEach(e => {
                if (e.rate !== 2500) {
                    toUpdate.push({ _id: e._id, oldRate: e.rate, newRate: 2500, key });
                }
            });
            continue;
        }

        const correctRate = CORRECT_FC[key];
        if (!correctRate) {
            console.log('  UNKNOWN key:', key, '- skipping');
            continue;
        }

        // Sort: correct rate first, wrong rate last
        entries.sort((a, b) => {
            const aCorrect = a.rate === correctRate ? 0 : 1;
            const bCorrect = b.rate === correctRate ? 0 : 1;
            return aCorrect - bCorrect;
        });

        if (entries.length === 1) {
            if (entries[0].rate !== correctRate) {
                toUpdate.push({ _id: entries[0]._id, oldRate: entries[0].rate, newRate: correctRate, key });
            }
        } else {
            // Multiple entries: keep the one with correct rate, delete wrong ones
            // If none has the correct rate, update the first one and delete the rest
            const hasCorrect = entries.find(e => e.rate === correctRate);
            if (hasCorrect) {
                // Delete all entries that don't have the correct rate
                entries.filter(e => e.rate !== correctRate).forEach(e => {
                    toDelete.push({ _id: e._id, rate: e.rate, key });
                });
            } else {
                // Update first entry to correct rate, delete rest
                toUpdate.push({ _id: entries[0]._id, oldRate: entries[0].rate, newRate: correctRate, key });
                entries.slice(1).forEach(e => toDelete.push({ _id: e._id, rate: e.rate, key }));
            }
        }
    }

    console.log('\nTo DELETE (wrong duplicates):', toDelete.length);
    toDelete.forEach(d => console.log('  DELETE', d.key, 'rate=' + d.rate, 'id=' + d._id));

    console.log('\nTo UPDATE (wrong rates):', toUpdate.length);
    toUpdate.forEach(u => console.log('  UPDATE', u.key, u.oldRate, '->', u.newRate, 'id=' + u._id));

    // Apply changes
    let deleted = 0, updated = 0;
    for (const d of toDelete) {
        await db.collection('workrates').updateOne({ _id: d._id }, { $set: { removed: true } });
        deleted++;
    }
    for (const u of toUpdate) {
        await db.collection('workrates').updateOne({ _id: u._id }, { $set: { rate: u.newRate } });
        updated++;
    }

    console.log('\n✅ Done! Deleted:', deleted, 'Updated:', updated);

    // Verify final state
    const final = await db.collection('workrates').find({
        category: 'Water Proofing',
        subCategory: 'First Coat',
        removed: false
    }).toArray();
    console.log('\nFinal First Coat WP rates:', final.length);
    final.sort((a, b) => (a.buildingName || '').localeCompare(b.buildingName || ''));
    final.forEach(r => {
        const k = (r.buildingName || 'Duplex') + '|' + r.unitType;
        const correct = CORRECT_FC[k] || 2500;
        const ok = (r.unitType === 'Duplex' ? r.rate === 2500 : r.rate === correct);
        console.log((ok ? '✅' : '❌') + ' [' + r.buildingName + '] [' + r.unitType + '] rate=' + r.rate + (r.unitNumber ? ' unit=' + r.unitNumber : ''));
    });

    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
