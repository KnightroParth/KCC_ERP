const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
    try {
        await mongoose.connect(process.env.DATABASE);
        console.log('✅ Connected to DB');

        require(path.join(__dirname, '..', 'src/models/appModels/WorkRate.js'));
        require(path.join(__dirname, '..', 'src/models/appModels/Unit.js'));

        const WorkRate = mongoose.model('WorkRate');
        const Unit = mongoose.model('Unit');

        const unit = await Unit.findOne({ unitNumber: 'D-10' }).lean();
        if (!unit) { console.log('Unit D-10 not found'); process.exit(0); }

        console.log('Unit:', JSON.stringify(unit, null, 2));

        // Simulate logic
        const unitBuildingNorm = (unit.buildingName || '').replace(/[\s-]/g, '').toUpperCase(); // C2
        const unitFloor = unit.floor || unit.floorNumber || 0; // 0

        console.log(`Searching rates for BuildingNorm: "${unitBuildingNorm}", Floor: ${unitFloor}`);

        const rates = await WorkRate.find({
            buildingName: { $regex: /^C2\s*$/i }, // lenient matching
            category: 'Mivan',
            subCategory: 'Mivan Centering'
        }).lean();

        console.log(`Found ${rates.length} rates for C2 Mivan Centering`);

        rates.forEach(wr => {
            const wrBuildingNorm = (wr.buildingName || '').replace(/[\s-]/g, '').toUpperCase();
            const inFloor = unitFloor >= (wr.minFloor ?? 0) && unitFloor <= (wr.maxFloor ?? 1000);
            const buildingMatch = wrBuildingNorm === unitBuildingNorm;

            console.log(`[Rate ${wr._id.toString().slice(-4)}] Bld: "${wr.buildingName}" Rate: ${wr.rate} Range: ${wr.minFloor}-${wr.maxFloor} UnitType: "${wr.unitType}" Match? ${buildingMatch}&&${inFloor}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
