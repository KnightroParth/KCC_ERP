const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const UNIT_MAP = [
    // C1: D-1 to D-5 -> Floor 0; D-6 to D-9 -> Floor 1
    { start: 1, end: 5, building: 'C1', floor: 0 },
    { start: 6, end: 9, building: 'C1', floor: 1 },

    // C2: D-10 to D-14 -> Floor 0; D-15 to D-18 -> Floor 1
    { start: 10, end: 14, building: 'C2', floor: 0 },
    { start: 15, end: 18, building: 'C2', floor: 1 },

    // C3: D-19 to D-20 -> Floor 0
    { start: 19, end: 20, building: 'C3', floor: 0 },

    // C4: D-21 to D-26 -> Floor 0; D-27 to D-30 -> Floor 1
    // (User said D-27 to D-31 is Floor 1, but D-31 is start of C5 range. Assuming C4 ends at 30)
    { start: 21, end: 26, building: 'C4', floor: 0 },
    { start: 27, end: 30, building: 'C4', floor: 1 },

    // C5: D-31 to D-36 -> Floor 0; D-37 to D-42 -> Floor 1
    { start: 31, end: 36, building: 'C5', floor: 0 },
    { start: 37, end: 42, building: 'C5', floor: 1 }
];

(async () => {
    try {
        await mongoose.connect(process.env.DATABASE);
        console.log('✅ Connected to DB');

        require(path.join(__dirname, '..', 'src/models/appModels/Unit.js'));
        const Unit = mongoose.model('Unit');

        let updatedCount = 0;

        for (const map of UNIT_MAP) {
            const { start, end, building, floor } = map;
            console.log(`Processing ${building} (Floor ${floor}): D-${start} to D-${end}`);

            // Generate unit numbers D-X
            const unitNumbers = [];
            for (let i = start; i <= end; i++) {
                unitNumbers.push(`D-${i}`);
            }

            const result = await Unit.updateMany(
                { unitNumber: { $in: unitNumbers } },
                {
                    $set: {
                        buildingName: building,
                        floorNumber: floor,
                        floor: floor
                    }
                }
            );

            console.log(`   -> Matched ${result.matchedCount}, Modified ${result.modifiedCount}`);
            updatedCount += result.modifiedCount;
        }

        console.log(`\n🎉 Total Units Updated: ${updatedCount}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
