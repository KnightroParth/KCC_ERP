/**
 * Import WorkRates from "At Glance Activity wise cost.xlsx"
 * Usage: node backend/scripts/importRates.js [projectId|all]
 *   - all (default): Import for ALL projects (Lotus Park, Lotus Green, Lotus Height)
 *   - KCC-2026-001: Import only for Lotus Park
 *   - KCC-2026-002: Import only for Lotus Green, etc.
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');

// Models
require('../src/models/appModels/WorkRate');
const WorkRate = mongoose.model('WorkRate');

// Mapping for names (Excel -> App)
const TASK_MAPPING = {
    // Electrical Work-I
    'Slab Piping+wall wall': 'Slab Piping',
    'Wall Pipeing & Ziri cutting+pipe fitting+ Repair': 'Ziri Cutting + Pipe fitting',
    'Conceiled box fitting': 'Conselled box fitting',
    'Block wiring': 'Block Wiring',
    'switch plate fitting': 'Switch Plate fitting',
    'Testing Final Repair & Finish': 'Testing Repair & Finish',
    '   Testing Final Repair & Finish': 'Testing Repair & Finish',
    'Testing': 'Final Testing',

    // Water Proofing
    'Chipping , Leakage Pipe & First Coat': 'Chipping & Leakage Pipe',
    'Koba filling & Finishing': 'Koba filling & Finishing',

    // Plumbing-I
    'Bath + Wash + Toilet & Kitchen internal pipe line fitting': 'Internal Pipe Line Fitting',
    'Bath + Wash + Toilet & Kitchen internal pipe line testing': 'Zari Repairing & Testing',
    'Internal drainage line bath+wash+Toilet & kitchen nani trap fitting': 'Nani trap fitting',
    'Internal drainage line bath+wash+Toilet & kitchen nani trap fitting ': 'Nani trap fitting',
    'Show fitting (commode, basin, cistern) + Water meter': 'Show Fitting',

    // Plumbing-E
    'Rain water pipe line fitting upto rain water harvesting': 'Rain Water Line Fitting',
    'Outer drainage line – Toilet outlet (75 mm & 110 mm pipe fitting)': 'Toilet Outlet Pipe Fitting',
    'Kitchen + Bal outlet pipe (75 mm) pipe line fitting upto chamber': 'Kichen & Bal Outlet pipe Fitting',
    'Water tank to block water supply pipe-2 nos-': 'Water Supply Line',

    // Tiles
    'Floor,Wall Tiles': 'Floor',
    'Floor,Wall Tiles ': 'Floor',
    'Floor  scurting': 'Floor Scurting',
    'Kitchen- Wall': 'Kitchen- Wall',
    'Kitchen Otta': 'Kitchen- Otta',
    'Window Seal': 'Window Seal',
    'kadapa Rack': 'Kadapa Rack',
    'Toiltet-1 Comn - Wall': 'Toilet-1 Wall',
    'Toiltet-1 Comn - Floor': 'Toilet-1 Floor',
    'Toiltet-2 Attach - Wall': 'Toilet-2 Wall',
    'Toiltet-2 Attach -Floor': 'Toilet-2 Floor',
    'Toiltet-3Attach - Wall': 'Toilet-3 Wall',
    'Toiltet-3Attach -Floor': 'Toilet-3 Floor',
    'Acid wash': 'Acid Wash',
    'Extra work': 'Extra Work',

    // POP
    'Dhar & Line finishing of beam and column': 'Dhar & Line finishing of beam and column',
    'False Ceiling': 'False Ceiling',
    'Metal Framing': 'Metal Framing',
    'Sheet fitting & Finishing': 'Sheet fitting & Finishing',
    'Electric Hole Cutting ': 'Electric Hole Cutting',

    // Civil Work - This one is tricky because app uses rooms, but Excel uses broad categories. 
    // We'll leave it for now or rely on default rates if possible.
    'Loft': 'Kitchen', // Rough mapping if needed

    // Painting
    'Granding (1.0/sft)': 'Grinding',
    'Granding (1.0/sft)     ': 'Grinding',
    'Putti-1 (1.25/ sft)': 'Putti-1',
    'Putti-2 with Final Base (1.25/ sft)': 'Putti-2 (Final Base)',
    'Ghassai + Primer(1.0/ sft)': 'Primer/Gasai',
    'Paint coat- 1(0.75/ sft)': 'Paint Coat-1',
    'Paint coat- 2(0.75/ sft)': 'Paint Coat-2',
    'Oil paint = Door Frame+Grill+Railing': 'O Paint =Door+Grill+Chaukat+Railing',
    'Cleaning 100%': 'Cleaning 100%',
    'Texture (1.0/ sft)': 'Texture'
};

const CATEGORY_MAPPING = {
    'Electrical-I': 'Electrical Work-I',
    'Electrical Line-E': 'Electrical Work-E',
    'Electrical Work-E': 'Electrical Work-E',
    'Water Proofing': 'Water Proofing',
    'Plumbing-I': 'Plumbing-I',
    'Plumbing-E': 'Plumbing-E',
    'Tiles': 'Tiles',
    'Tiles ': 'Tiles',
    'Tiles -F': 'Tiles',
    'Tiles -W': 'Tiles',
    'Tiles -Otta': 'Tiles',
    'Tiles- W': 'Tiles',
    'Tiles-W': 'Tiles',
    'Gypsum/pop-w': 'POP',
    'Gypsum/pop-c': 'POP',
    'pop-w ': 'POP',
    'pop-c ': 'POP',
    'Painting': 'Painting',
    'Civil Work': 'Civil Work',
    'Finishing': 'Finishing-W',
    'Fabrication work': 'Fabrication Work',
};

require('../src/models/appModels/Project');
const Project = mongoose.model('Project');

async function importRates() {
    await mongoose.connect(process.env.DATABASE || process.env.MONGODB_URI);
    console.log('Connected to database.');

    const projectArg = process.argv[2] || 'all';
    let projectIds = [];
    if (projectArg === 'all' || projectArg === 'ALL') {
        const projects = await Project.find({ removed: { $ne: true } }).select('_id projectCode').lean();
        projectIds = projects.map((p) => p.projectCode || p._id.toString());
        console.log('Importing for ALL projects:', projectIds.map((id, i) => (projects[i]?.projectCode || id)));
    } else {
        projectIds = [projectArg];
        console.log('Importing for project:', projectArg);
    }

    const filePath = path.join(__dirname, '..', '..', 'At Glance Activity wise cost.xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Define the columns mapping from Row 3/4
    // Row 3: [null,null,"Building -",null," A3","A1,A2"," A3","A1, A2"]
    // Row 4: [null,null,"Type of Unit-",null,"1 BHK","1 BHK","2 BHK","2 BHK","3 BHK"]
    const cols = [
        { building: 'A3', type: '1BHK', index: 4 },
        { building: 'A1,A2', type: '1BHK', index: 5 },
        { building: 'A3', type: '2BHK', index: 6 },
        { building: 'A1,A2', type: '2BHK', index: 7 },
        { building: 'AllBuildings', type: '3BHK', index: 8 }
    ];

    let floorRange = { min: 0, max: 100 };
    let currentCategory = '';

    for (const projectId of projectIds) {
        console.log('\n--- Project:', projectId, '---');
        await WorkRate.deleteMany({ projectId });
        floorRange = { min: 0, max: 100 };
        currentCategory = '';

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const cellA = String(row[0] || '').trim();
        const cellB = String(row[1] || '').trim();
        const cellC = String(row[2] || '').trim();

        // Detect Floor Range
        if (cellC.includes('1 to 4rth floor')) {
            floorRange = { min: 1, max: 4 };
            continue;
        } else if (cellC.includes('5 to 7 floor')) {
            floorRange = { min: 5, max: 7 };
            continue;
        } else if (cellC.includes('8 to 11 floor') || cellC.includes('8 to 10 floor')) {
            floorRange = { min: 8, max: 11 };
            continue;
        }

        // Category: Excel col 1 - update when it looks like a category
        if (cellB && !/^\d+$/.test(cellB) && (CATEGORY_MAPPING[cellB] || CATEGORY_MAPPING[cellB.trim()])) {
            currentCategory = cellB.trim();
        }
        if (/^[A-Z]$/.test(cellA)) {
            if (cellB) currentCategory = cellB.trim();
            continue;
        }

        // Process Subwork (skip header rows)
        const subWorkRaw = cellC || cellB;
        if (!subWorkRaw || /^(SN|Work|Sub|Remark)/i.test(String(subWorkRaw).trim())) continue;

        const appTaskName = TASK_MAPPING[subWorkRaw.trim()] || TASK_MAPPING[cellC?.trim()] || TASK_MAPPING[cellB?.trim()] || subWorkRaw.trim();
        const appCategoryName = CATEGORY_MAPPING[currentCategory] || CATEGORY_MAPPING[cellB?.trim()] || 'Other';

        if (appTaskName && appCategoryName) {
            for (const col of cols) {
                const rate = parseFloat(row[col.index]);
                if (!isNaN(rate)) {
                    await WorkRate.create({
                        projectId,
                        category: appCategoryName,
                        subCategory: appTaskName,
                        unitType: col.type,
                        buildingPattern: col.building,
                        minFloor: floorRange.min,
                        maxFloor: floorRange.max,
                        rate: rate
                    });
                }
            }
        }
    }

        console.log('Created rates for', projectId);
    }

    console.log('\nImport finished for all projects.');
    process.exit();
}

importRates();
