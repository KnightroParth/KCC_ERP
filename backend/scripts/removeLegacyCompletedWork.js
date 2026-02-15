/**
 * Remove legacy completed work import: the "Legacy Billed" invoice(s),
 * all PlannedWork linked to them, and Activities created by that import
 * (activityCode starting with "LEGACY-").
 *
 * Usage: node backend/scripts/removeLegacyCompletedWork.js [--dry-run]
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

require('../src/models/appModels/PlannedWork');
require('../src/models/appModels/activities');
require('../src/models/appModels/Invoice');

const PlannedWork = mongoose.model('PlannedWork');
const Activities = mongoose.model('Activities');
const Invoice = mongoose.model('Invoice');

const dryRun = process.argv.includes('--dry-run');

async function run() {
  await mongoose.connect(process.env.DATABASE || process.env.MONGODB_URI);
  console.log('Connected to DB.');

  const toDeleteInvoiceIds = [];
  const toDeletePlannedWorkIds = new Set();

  const invoices = await Invoice.find({
    removed: { $ne: true },
    plannedWorkIds: { $exists: true, $ne: [] },
  })
    .select('_id items plannedWorkIds')
    .lean()
    .exec();

  for (const inv of invoices) {
    const isLegacy =
      (inv.items && inv.items.some((i) => (i.itemName || '').includes('Legacy') || (i.description || '').includes('Legacy') || (i.description || '').includes('merged from previous'))) ||
      (Array.isArray(inv.plannedWorkIds) && inv.plannedWorkIds.length > 500);
    if (isLegacy) {
      toDeleteInvoiceIds.push(inv._id);
      if (Array.isArray(inv.plannedWorkIds)) {
        inv.plannedWorkIds.forEach((id) => toDeletePlannedWorkIds.add((id && (id._id || id)).toString()));
      }
    }
  }

  const pwIds = [...toDeletePlannedWorkIds].filter(Boolean);
  console.log('Invoices to remove:', toDeleteInvoiceIds.length);
  console.log('PlannedWork to remove:', pwIds.length);

  if (!dryRun) {
    if (pwIds.length > 0) {
      const pwResult = await PlannedWork.deleteMany({ _id: { $in: pwIds.map((id) => new mongoose.Types.ObjectId(id)) } });
      console.log('Deleted PlannedWork:', pwResult.deletedCount);
    }
    if (toDeleteInvoiceIds.length > 0) {
      const invResult = await Invoice.deleteMany({ _id: { $in: toDeleteInvoiceIds } });
      console.log('Deleted Invoices:', invResult.deletedCount);
    }
  }

  const actResult = await Activities.find({ activityCode: /^LEGACY-/ }).select('_id').lean().exec();
  const activityIds = actResult.map((a) => a._id);
  console.log('Activities (LEGACY-*) to remove:', activityIds.length);

  if (!dryRun && activityIds.length > 0) {
    const delAct = await Activities.deleteMany({ _id: { $in: activityIds } });
    console.log('Deleted Activities:', delAct.deletedCount);
  }

  if (dryRun) {
    console.log('Dry run – no deletes. Remove --dry-run to actually remove.');
  } else {
    console.log('Done.');
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
