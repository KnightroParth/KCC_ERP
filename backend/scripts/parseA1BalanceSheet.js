/**
 * Parse "A-1 Balance Work Sheet .xlsx" (Lotus Park Building A1) into JSON for importLotusParkProgressOnly.js.
 * Sheet: each row has Work (category), Item (task), Floor label, and flat numbers in columns E–P.
 * Output: array of { projectCode, buildingName, unitNumber, category, workType, rate }.
 *
 * Usage: node backend/scripts/parseA1BalanceSheet.js [projectCode]
 *        Default projectCode: KCC-2026-001
 * Output to stdout. Redirect to file: node ... > a1-completed.json
 */
const xlsx = require('xlsx');
const path = require('path');

const projectCode = process.argv[2] || 'KCC-2026-001';
const buildingName = 'A1'; // Building A-1; Units may be stored as A1 or A-1
const excelPath = path.join(__dirname, '..', '..', 'A-1 Balance Work Sheet .xlsx');

// Excel "Work" (column B) -> our category
const WORK_TO_CATEGORY = {
  'Colouring work': 'Painting',
  'Plumbing ': 'Plumbing-I',
  'Plumbing': 'Plumbing-I',
  'POP': 'POP',
  'Tile': 'Tiles',
  'Tiles': 'Tiles',
  'Kitchen otta frame': 'Tiles',
  'Window': 'Tiles',
  'Lofts': 'Civil Work',
};

// Excel "Item" (column C) -> our workType (must match WORK_TASK_CONFIG / Planning)
const ITEM_TO_WORKTYPE = {
  // Electrical Work-I
  'Slab & Wall Pipeing': 'Slab Piping',
  'Ziri cutting-+piping': 'Ziri Cutting + Pipe fitting',
  'Metal box fitting': 'Conselled box fitting',
  'Block wiring': 'Block Wiring',
  'Repairing': 'Testing Repair & Finish',
  'Fan Hooks': 'Testing Repair & Finish', // or leave as-is if not in config; we'll map to closest
  'Switch plate fitting': 'Switch Plate fitting',
  'Testing': 'Final Testing',
  'Meter drop wiring': 'Block to parking meter panel wiring',
  'Staircase': null, // skip – not per-unit
  'Staircase testing': null,
  'Reserve': null,
  // Painting
  'Grinding': 'Grinding',
  'Putti-1st coat': 'Putti-1',
  'Putti-2nd coat': 'Putti-2 (Final Base)',
  'Ghasai+primer': 'Primer/Gasai',
  '1st coat paint': 'Paint Coat-1',
  '2st coat paint +door frame & grill oil paint': 'Paint Coat-2',
  'Cleaning': 'Cleaning 100%',
  // Plumbing
  ' internal Pipe ziri cutting': 'Zari Cutting + Holes',
  'Internal Pipe Fitting': 'Internal Pipe Line Fitting',
  'Zari Repairing & Testing': 'Zari Repairing & Testing',
  'Nani & P-Trap Fitting': 'Nani trap fitting',
  'Kitchen outlet pipe': 'Kichen & Bal Outlet pipe Fitting',
  'Toilet outlet pipe ': 'Toilet Outlet Pipe Fitting',
  'Show Fitting (Commod,Basin,Cistern)': 'Show Fitting',
  'water tank to block water supply pipe + Toilet & bath outlet line': 'Water Supply Line',
  'Rain water pipe': 'Rain Water Line Fitting',
  'Toilet+Chipping Coating Leakage Pipe': 'Chipping & Leakage Pipe',
  'Cement Ghotie Plaster Slope To Leakage Pipe': 'Chipping & Leakage Pipe',
  'Koba Filling & Finishing': 'Koba filling & Finishing',
  // POP
  'Frame': 'Metal Framing',
  'POP Sheet': 'Sheet fitting & Finishing',
  'POP Dhara': 'Dhar & Line finishing of beam and column',
  // Tiles
  'Floor Tile+Skirting': 'Floor',
  'Wash floor+wall tile': 'Balcony Wall',
  'C-Toilet Tile (Floor & Wall)': 'Toilet-2 Floor',
  'A-Toilet (Floor & Wall)': 'Toilet-1 Floor',
  'kitchen otta wall tile': 'Kitchen- Wall',
  'Below kitchen otta flooring': 'Kitchen- Otta',
  'Kadappa Rack': 'Kadapa Rack',
  'Granite Window Sill': 'Window Seal',
  'Kitchen-Frame': 'Kitchen- Otta',
  'Floor Chipping': 'Floor Scurting',
  'Granite Door Sill (Hall+Washup)': 'Extra Work',
  'Ventillator Wall Tiles (C-Toilet)': 'Toilet-2 Wall',
  'Counter Basin Granite Top': 'Extra Work',
  'Counter Basin Wall Tiles': 'Extra Work',
  'Tacche': 'Extra Work',
  'Kitchen Otta': 'Kitchen- Otta',
  // Civil / Finishing
  'Door-frame': 'Hall',
  'Door-Panel': 'Hall',
  'Alu-Window': 'Hall',
  'Chajja-Centering': 'Hall',
  'Chajja-Casting': 'Hall',
  'Man-Hole Centering+Steel Binding+Casting': null,
};

// Item -> category override (when sheet Work doesn't match our category)
const ITEM_TO_CATEGORY_OVERRIDE = {
  'Toilet+Chipping Coating Leakage Pipe': 'Water Proofing',
  'Cement Ghotie Plaster Slope To Leakage Pipe': 'Water Proofing',
  'Koba Filling & Finishing': 'Water Proofing',
};

// When Work is empty, infer category from Item (first section is Electrical)
const ITEM_TO_CATEGORY_WHEN_WORK_EMPTY = {
  'Slab & Wall Pipeing': 'Electrical Work-I',
  'Ziri cutting-+piping': 'Electrical Work-I',
  'Metal box fitting': 'Electrical Work-I',
  'Block wiring': 'Electrical Work-I',
  'Repairing': 'Electrical Work-I',
  'Fan Hooks': 'Electrical Work-I',
  'Switch plate fitting': 'Electrical Work-I',
  'Testing': 'Electrical Work-I',
  'Meter drop wiring': 'Electrical Work-E',
  'Staircase': null,
  'Staircase testing': null,
  'Reserve': null,
};

function isFlatNumber(v) {
  if (v == null || v === '') return false;
  const n = Number(v);
  if (!Number.isInteger(n)) return false;
  return n >= 100 && n <= 999;
}

const wb = xlsx.readFile(excelPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const out = [];
let currentWork = '';
let currentItem = '';
const FLAT_COL_START = 4;
const FLAT_COL_END = 16;

for (let i = 2; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length < FLAT_COL_END) continue;

  if (row[1]) currentWork = String(row[1]).trim();
  if (row[2]) currentItem = String(row[2]).trim();
  if (!currentItem) continue;

  const workType = ITEM_TO_WORKTYPE[currentItem];
  if (workType == null && ITEM_TO_WORKTYPE.hasOwnProperty(currentItem)) continue; // explicitly skip
  const mappedWorkType = workType || currentItem;

  let category = ITEM_TO_CATEGORY_OVERRIDE[currentItem] || WORK_TO_CATEGORY[currentWork];
  if (!category && ITEM_TO_CATEGORY_WHEN_WORK_EMPTY[currentItem]) {
    category = ITEM_TO_CATEGORY_WHEN_WORK_EMPTY[currentItem];
  }
  if (!category) category = 'Other';

  for (let c = FLAT_COL_START; c <= FLAT_COL_END; c++) {
    const val = row[c];
    if (!isFlatNumber(val)) continue;
    const unitNumber = String(Number(val));
    out.push({
      projectCode,
      buildingName,
      unitNumber,
      category,
      workType: mappedWorkType,
      rate: 0,
    });
  }
}

console.log(JSON.stringify(out, null, 2));
if (process.stderr.isTTY) process.stderr.write(`Parsed ${out.length} rows for Building A1.\n`);
