/**
 * Parse extracted text from "lotus park software sheet at glance.pdf" → JSON for import.
 * Usage: node backend/scripts/parseLotusParkPdfText.js lotus-park-extract.txt [projectCode]
 *        Default projectCode: KCC-2026-001
 */
const fs = require('fs');
const path = require('path');
const inputPath = process.argv[2];
const projectCode = process.argv[3] || 'KCC-2026-001';
const buildingName = 'A3';

const text = inputPath ? fs.readFileSync(path.resolve(inputPath), 'utf8') : fs.readFileSync(0, 'utf8');

const SECTION_TO_CATEGORY = {
  'Electrical Work': 'Electrical Work-I',
  'Electrical Line': 'Electrical Work-E',
  'Plumbing Work': 'Plumbing-I',
  'Inside plaster': 'POP',
  'Inside plaster / Gypsum': 'POP',
  'Water Proofing': 'Water Proofing',
  'Tiles': 'Tiles',
  'Painting': 'Painting',
  'Civil Work': 'Civil Work',
};

const SECTION_TASKS = {
  'Electrical Work-I': ['Slab Piping', 'Ziri Cutting + Pipe fitting', 'Conselled box fitting', 'Block Wiring', 'Switch Plate fitting', 'Testing Repair & Finish', 'Final Testing'],
  'Electrical Work-E': ['Block to parking meter panel pipe fitting', 'Block to parking meter panel wiring', 'Block Panel Fitting', 'Testing'],
  'Plumbing-I': ['Slab Pipeing', 'Zari Cutting + Holes', 'Internal Pipe Line Fitting', 'Zari Repairing & Testing', 'Nani trap fitting', 'Show Fitting'],
  'Plumbing-E': ['Rain Water Line Fitting', 'Toilet Outlet Pipe Fitting', 'Kichen & Bal Outlet pipe Fitting', 'Water Supply Line', 'Ground Water Tank To Overhead', 'Additional Work'],
  'POP': ['Dhar & Line finishing of beam and column', 'False Ceiling', 'Metal Framing', 'Sheet fitting & Finishing', 'Electric Hole Cutting'],
};
const PLUMBING_COMBINED_TASKS = [
  ...SECTION_TASKS['Plumbing-I'].map((w) => ({ category: 'Plumbing-I', workType: w })),
  ...SECTION_TASKS['Plumbing-E'].map((w) => ({ category: 'Plumbing-E', workType: w })),
];

function parseUnitLine(line) {
  const m = line.match(/Floor\s*(\d{3})(\d-BHK)/i);
  return m ? { unitNumber: m[1], unitType: m[2] } : null;
}
function isUnitLine(line) {
  return /Floor\s*\d{3}\d-BHK/i.test(line);
}
function parsePercentLine(line) {
  const s = line.replace(/\s/g, '');
  if (!/^\d+$/.test(s)) return null;
  const chunks = s.match(/100|0/g);
  return chunks ? chunks.map((x) => (x === '100' ? 100 : 0)) : null;
}

const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const out = [];
let currentCategory = '';
let currentTasks = [];
let unitLines = [];
let digitLines = [];

function flushSection() {
  if (currentTasks.length === 0 || unitLines.length === 0 || digitLines.length === 0) return;
  const nUnits = Math.min(unitLines.length, digitLines.length);
  for (let u = 0; u < nUnits; u++) {
    const units = parseUnitLine(unitLines[u]);
    if (!units) continue;
    const digits = parsePercentLine(digitLines[u]) || [];
    for (let t = 0; t < Math.min(currentTasks.length, digits.length); t++) {
      if (digits[t] !== 100) continue;
      const task = currentTasks[t];
      const category = typeof task === 'object' ? task.category : currentCategory;
      const workType = typeof task === 'object' ? task.workType : task;
      out.push({ projectCode, buildingName, unitNumber: units.unitNumber, unitType: (units.unitType || '1BHK').replace(/\s/g, ''), category, workType, rate: 0 });
    }
  }
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const sectionMatch = /^[A-Z]\)\s*(.+)$/.exec(line) || (line === 'Plumbing Work' ? ['', 'Plumbing Work'] : null) || (line.startsWith('Inside plaster') ? ['', line] : null) || (line === 'Water Proofing' ? ['', line] : null) || (line === 'Tiles' ? ['', line] : null) || (line === 'Painting' ? ['', line] : null) || (line === 'Civil Work' ? ['', line] : null);
  if (sectionMatch) {
    flushSection();
    const sectionName = (sectionMatch[1] || line).trim();
    currentCategory = SECTION_TO_CATEGORY[sectionName] || sectionName;
    currentTasks = sectionName === 'Plumbing Work' ? PLUMBING_COMBINED_TASKS : (SECTION_TASKS[currentCategory] || []);
    unitLines = [];
    digitLines = [];
    continue;
  }
  if (isUnitLine(line)) {
    unitLines.push(line);
    continue;
  }
  const digits = parsePercentLine(line);
  if (digits && digits.length >= 2 && digits.length <= 20) {
    digitLines.push(line);
    continue;
  }
}
flushSection();

console.log(JSON.stringify(out, null, 2));
