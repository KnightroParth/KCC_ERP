/**
 * importWorkRates.js
 * Robust import of "At Glance Activity wise cost.xlsx" into WorkRate collection.
 * Handles bundled/consolidated rates (e.g., "Zari Cutting + Plumbing = 200") intelligently.
 *
 * Usage: node backend/scripts/importWorkRates.js [projectId]
 * Default projectId: KCC-2026-001 (Lotus Park)
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');

require('../src/models/appModels/WorkRate');
const WorkRate = mongoose.model('WorkRate');

// ─── Excel → App Name Mapping (keys are TRIMMED Excel values) ─────────────────
const TASK_MAPPING = {
    'Slab Piping+wall wall': 'Slab Piping',
    'Wall Pipeing & Ziri cutting+pipe fitting+ Repair': 'Ziri Cutting + Pipe fitting',
    'Conceiled box fitting': 'Conselled box fitting',
    'Block wiring': 'Block Wiring',
    'switch plate fitting': 'Switch Plate fitting',
    'Testing Final Repair & Finish': 'Testing Repair & Finish',
    '   Testing Final Repair & Finish': 'Testing Repair & Finish',
    'Testing': 'Final Testing',
    'Chipping , Leakage Pipe & First Coat': 'Chipping & Leakage Pipe',
    'Koba filling & Finishing': 'Koba filling & Finishing',
    'Bath + Wash + Toilet & Kitchen internal pipe line fitting': 'Internal Pipe Line Fitting',
    'Bath + Wash + Toilet & Kitchen internal pipe line testing': 'Zari Repairing & Testing',
    'Internal drainage line bath+wash+Toilet & kitchen nani trap fitting ': 'Nani trap fitting',
    'Internal drainage line bath+wash+Toilet & kitchen nani trap fitting': 'Nani trap fitting',
    'Show fitting (commode, basin, cistern) + Water meter': 'Show Fitting',
    'Rain water pipe line fitting upto rain water harvesting': 'Rain Water Line Fitting',
    'Outer drainage line – Toilet outlet (75 mm & 110 mm pipe fitting)': 'Toilet Outlet Pipe Fitting',
    'Kitchen + Bal outlet pipe (75 mm) pipe line fitting upto chamber': 'Kichen & Bal Outlet pipe Fitting',
    'Water tank to block water supply pipe-2 nos-': 'Water Supply Line',
    'Floor,Wall Tiles ': 'Floor',
    'Floor,Wall Tiles': 'Floor',
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
    'Wash- Floor': 'Floor',
    'Wash- wall': 'Balcony Wall',
    'Acid wash': 'Acid Wash',
    'Extra work': 'Extra Work',
    'Dhar & Line finishing of beam and column': 'Dhar & Line finishing of beam and column',
    'False Ceiling': 'False Ceiling',
    'Metal Framing': 'Metal Framing',
    'Sheet fitting & Finishing': 'Sheet fitting & Finishing',
    'Electric Hole Cutting ': 'Electric Hole Cutting',
    'Electric Hole Cutting': 'Electric Hole Cutting',
    'Granding (1.0/sft)     ': 'Grinding',
    'Granding (1.0/sft)': 'Grinding',
    'Putti-1 (1.25/ sft)': 'Putti-1',
    'Putti-2 with Final Base (1.25/ sft)': 'Putti-2 (Final Base)',
    'Ghassai + Primer(1.0/ sft)': 'Primer/Gasai',
    'Paint coat- 1(0.75/ sft)': 'Paint Coat-1',
    'Paint coat- 2(0.75/ sft)': 'Paint Coat-2',
    'Oil paint = Door Frame+Grill+Railing': 'O Paint =Door+Grill+Chaukat+Railing',
    'Cleaning 100%': 'Cleaning 100%',
    'Texture (1.0/ sft)': 'Texture',
    'Meter drop to isolator': 'Block to parking meter panel pipe fitting',
    'Door Frame Fitting': 'Hall',
    'Door Panels': 'Hall',
    'Wash up pipe & Concrete Finish': 'Wash up pipe & Concrete Finish',
};

// Excel col 1 (Work Category) -> workConfig category label
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
    'Gypsum/pop-w ': 'POP',
    'Gypsum/pop-c': 'POP',
    'Gypsum Work': 'POP',
    'pop-w ': 'POP',
    'pop-c ': 'POP',
    'Painting': 'Painting',
    'Civil Work': 'Civil Work',
    'Finishing': 'Finishing-W',
    'Finishing- W': 'Finishing-W',
    'Finishing-D': 'Finishing-D',
    'Fabrication work': 'Fabrication Work',
};

// ─── Bundled Rate Detection & Parsing ─────────────────────────────────────────
const BUNDLED_PATTERNS = [/\s*\+\s*/, /\s+and\s+/i, /\s*&\s*/];

/**
 * Detect if an activity name represents a bundled/consolidated rate.
 */
function isBundledActivity(rawName) {
    if (!rawName || typeof rawName !== 'string') return false;
    const s = rawName.trim();
    return BUNDLED_PATTERNS.some((p) => p.test(s));
}

/**
 * Extract component activity names from a bundled string.
 * e.g. "Zari Cutting + Plumbing" → ["Zari Cutting", "Plumbing"]
 */
function parseComponentActivities(rawName) {
    if (!rawName || typeof rawName !== 'string') return [];
    const s = rawName.trim();
    const parts = s.split(/\s*\+\s*|\s+and\s+|\s*&\s*/i).map((p) => p.trim()).filter(Boolean);
    return parts.length > 1 ? parts : [];
}

/**
 * Standardize unit string (Sqm, Cum, No, etc.)
 */
function standardizeUnit(val) {
    if (val == null) return 'Sqm';
    const s = String(val).trim().toLowerCase();
    if (s.includes('cum') || s === 'cbm') return 'Cum';
    if (s.includes('no') || s === 'nos') return 'No';
    if (s.includes('sqm') || s.includes('sft')) return 'Sqm';
    if (/^\d+\s*bhk/i.test(s)) return s.replace(/\s+/g, ''); // 1BHK, 2BHK
    return 'Sqm';
}

/**
 * Parse numeric rate, handling empty and comma-separated values.
 */
function parseRate(val) {
    if (val == null || val === '') return NaN;
    const s = String(val).replace(/,/g, '').trim();
    const n = parseFloat(s);
    return isNaN(n) ? NaN : n;
}

// ─── Main Import Logic ────────────────────────────────────────────────────────

async function importWorkRates() {
    const projectId = process.argv[2] || 'KCC-2026-001';
    const filePath = path.join(__dirname, '..', '..', 'At Glance Activity wise cost.xlsx');

    let wb, sheetName, ws, rawData;
    try {
        wb = xlsx.readFile(filePath);
        sheetName = wb.SheetNames[0];
        ws = wb.Sheets[sheetName];
        rawData = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    } catch (err) {
        console.error('Error reading Excel file:', err.message);
        process.exit(1);
    }

    await mongoose.connect(process.env.DATABASE || process.env.MONGODB_URI);
    console.log('Connected to database. Project:', projectId);
    console.log('Deleting existing WorkRates for project...');
    await WorkRate.deleteMany({ projectId });
    console.log('Starting import from sheet:', sheetName);

    const cols = [
        { building: 'A3', type: '1BHK', index: 4 },
        { building: 'A1,A2', type: '1BHK', index: 5 },
        { building: 'A3', type: '2BHK', index: 6 },
        { building: 'A1,A2', type: '2BHK', index: 7 },
        { building: 'AllBuildings', type: '3BHK', index: 8 },
    ];

    let floorRange = { min: 0, max: 100 };
    let currentCategory = '';
    let createdCount = 0;

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const cellA = String(row[0] || '').trim();
        const cellB = String(row[1] || '').trim();
        const cellC = String(row[2] || '').trim();

        // Floor range detection (col 2)
        if (cellC.includes('1 to 4rth floor') || cellC.includes('1 to 4')) {
            floorRange = { min: 1, max: 4 };
            continue;
        }
        if (cellC.includes('5 to 7 floor') || cellC.includes('5 to 7')) {
            floorRange = { min: 5, max: 7 };
            continue;
        }
        if (cellC.includes('8 to 11 floor') || cellC.includes('8 to 10 floor')) {
            floorRange = { min: 8, max: 11 };
            continue;
        }

        // Category: Excel col 1 (Work Category) - update whenever cellB looks like a category
        if (cellB && !/^\d+$/.test(cellB) && (CATEGORY_MAPPING[cellB] || CATEGORY_MAPPING[cellB.trim()] || /^(Electrical|Plumbing|Water|Tiles|Gypsum|Painting|Civil|Finishing|Fabrication)/i.test(cellB))) {
            currentCategory = cellB.trim();
        }
        if (/^[A-Z]$/.test(cellA)) {
            if (cellB) currentCategory = cellB.trim();
            continue;
        }

        // Sub-work: Excel col 2 (Sub Work Category), fallback col 1
        const subWorkRaw = cellC || cellB;
        if (!subWorkRaw || /^(SN|Work|Sub)/i.test(subWorkRaw)) continue;

        const subTrim = subWorkRaw.trim();
        const appTaskName = TASK_MAPPING[subTrim] || TASK_MAPPING[cellC?.trim()] || TASK_MAPPING[cellB?.trim()] || subTrim;
        const appCategoryName = CATEGORY_MAPPING[currentCategory] || CATEGORY_MAPPING[cellB?.trim()] || CATEGORY_MAPPING[currentCategory?.trim()] || 'Other';

        const isBundled = isBundledActivity(subWorkRaw);
        const components = isBundled ? parseComponentActivities(subWorkRaw) : [];
        const otherComponents = components.filter((c) => c !== appTaskName);

        for (const col of cols) {
            const rateVal = parseRate(row[col.index]);
            if (isNaN(rateVal) || rateVal < 0) continue;

            const payload = {
                projectId,
                category: appCategoryName,
                subCategory: appTaskName,
                unitType: standardizeUnit(col.type),
                buildingPattern: col.building,
                minFloor: floorRange.min,
                maxFloor: floorRange.max,
                rate: rateVal,
                isConsolidated: isBundled && components.length > 0,
                componentActivities: components,
                activityNote: isBundled && otherComponents.length > 0
                    ? `Includes: ${otherComponents.join(', ')}`
                    : undefined,
            };

            await WorkRate.create(payload);
            createdCount++;
        }
    }

    console.log(`Import finished. Created ${createdCount} WorkRate entries for project ${projectId}.`);
    process.exit(0);
}

importWorkRates().catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
});
