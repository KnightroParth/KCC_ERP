/**
 * Import Lotus Park "at glance" completed work as Activities with 100% progress only.
 * No billing, no invoice – only so Planning shows the red tick (work done) for those units.
 *
 * Usage:
 *   1. node backend/scripts/extractPdfText.js --out=lotus-park-extract.txt
 *   2. node backend/scripts/parseLotusParkPdfText.js lotus-park-extract.txt KCC-2026-001 > lotus-park-completed.json
 *   3. node backend/scripts/importLotusParkProgressOnly.js lotus-park-completed.json [--projectCode=KCC-2026-001] [--dry-run]
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('../src/models/appModels/activities');
require('../src/models/appModels/Project');
require('../src/models/appModels/Units');

const Activities = mongoose.model('Activities');
const Project = mongoose.model('Project');
const Units = mongoose.model('Units');

const args = process.argv.slice(2);
const jsonPath = args.find((a) => !a.startsWith('--'));
const projectCodeArg = args.find((a) => a.startsWith('--projectCode='));
const dryRun = args.includes('--dry-run');
const defaultProjectCode = projectCodeArg ? projectCodeArg.replace('--projectCode=', '').trim() : null;

async function run() {
  if (!jsonPath || !fs.existsSync(jsonPath)) {
    console.error('Usage: node backend/scripts/importLotusParkProgressOnly.js <lotus-park-completed.json> [--projectCode=KCC-2026-001] [--dry-run]');
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE || process.env.MONGODB_URI);
  console.log('Connected to DB.');

  let rows;
  try {
    rows = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    console.error('Invalid JSON:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('JSON must be a non-empty array.');
    process.exit(1);
  }

  const projectCode = defaultProjectCode || rows[0].projectCode;
  if (!projectCode) {
    console.error('Provide projectCode in JSON or --projectCode=...');
    process.exit(1);
  }

  const project = await Project.findOne({ projectCode, removed: { $ne: true } }).select('_id name').lean().exec();
  if (!project) {
    console.error('Project not found:', projectCode);
    process.exit(1);
  }
  const projectId = project._id;
  console.log('Project:', project.name, '(' + projectCode + ')');

  const unitCache = {};
  async function getUnitId(buildingName, unitNumber) {
    const key = `${buildingName}|${unitNumber}`;
    if (unitCache[key] != null) return unitCache[key];
    const altBuilding = buildingName === 'A1' ? 'A-1' : buildingName === 'A-1' ? 'A1' : null;
    let unit = await Units.findOne({
      projectId: projectCode,
      removed: { $ne: true },
      $or: [{ buildingName: buildingName }, { towerOrWing: buildingName }],
      unitNumber: String(unitNumber),
    })
      .select('_id')
      .lean()
      .exec();
    if (!unit && altBuilding) {
      unit = await Units.findOne({
        projectId: projectCode,
        removed: { $ne: true },
        $or: [{ buildingName: altBuilding }, { towerOrWing: altBuilding }],
        unitNumber: String(unitNumber),
      })
        .select('_id')
        .lean()
        .exec();
    }
    unitCache[key] = unit ? unit._id.toString() : null;
    return unitCache[key];
  }

  let created = 0;
  let skipped = 0;
  let duplicates = 0;
  const seenKey = new Set(); // unitId|workType – for dry-run count and duplicate detection

  for (const row of rows) {
    const buildingName = (row.buildingName || row.building || 'A3').toString().trim();
    const unitNumber = String(row.unitNumber || '').trim();
    const workType = (row.workType || '').toString().trim();
    const category = (row.category || '').toString().trim();

    if (!unitNumber || !workType) {
      skipped++;
      continue;
    }

    const unitId = await getUnitId(buildingName, unitNumber);
    if (!unitId) {
      skipped++;
      continue;
    }

    const key = `${unitId}|${workType}`;
    if (dryRun) {
      if (seenKey.has(key)) {
        duplicates++;
      } else {
        seenKey.add(key);
        created++;
      }
      continue;
    }

    const activityCode = `LOTUS-${projectCode}-${buildingName}-${unitNumber}-${workType.replace(/\s+/g, '-')}`;
    const existing = await Activities.findOne({
      projectId,
      unitId: new mongoose.Types.ObjectId(unitId),
      activityName: workType,
      removed: { $ne: true },
    }).lean().exec();
    if (existing) {
      duplicates++;
      continue;
    }

    await Activities.create({
      projectId,
      unitId: new mongoose.Types.ObjectId(unitId),
      activityCode,
      activityName: workType,
      unit: unitNumber,
      category,
      progress: '100%',
      status: 'Completed',
      removed: false,
      enabled: true,
    });
    created++;
  }

  console.log('Activities (100% progress) created:', created);
  if (duplicates > 0) console.log('Skipped (duplicate unit+task):', duplicates);
  if (skipped > 0) console.log('Skipped (missing unit/invalid row):', skipped);
  if (dryRun) console.log('Dry run – remove --dry-run to import.');
  else console.log('Done. Planning will show the tick for these unit+tasks (work progress only, no billing).');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
