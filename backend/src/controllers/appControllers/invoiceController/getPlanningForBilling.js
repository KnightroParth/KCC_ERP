const mongoose = require('mongoose');

const PlannedWork = mongoose.model('PlannedWork');
const Invoice = mongoose.model('Invoice');
const Activities = mongoose.model('Activities');
const Units = mongoose.model('Units');
const Project = mongoose.model('Project');

/**
 * GET /invoice/planning-for-billing
 * Query: weekEnd (ISO date, Saturday), projectId, contractorId
 * Returns planned work for that week (week ending Saturday) for billing chart.
 * - Excludes work already billed (in an active invoice).
 * - Only includes planned work whose linked activity has reached 100% progress (work progress complete).
 */
const getPlanningForBilling = async (req, res) => {
  const { weekEnd, projectId, contractorId } = req.query;

  if (!weekEnd) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'weekEnd (Saturday date) is required',
    });
  }

  const endDate = new Date(weekEnd);
  if (isNaN(endDate.getTime())) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'weekEnd must be a valid date',
    });
  }

  // Week: Monday to Saturday (6 days before weekEnd)
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  // Strict double-billing prevention: exclude work items already linked to any active invoice
  const allInvoicesWithPlannedWork = await Invoice.find({
    removed: false,
    plannedWorkIds: { $exists: true, $ne: [] },
    status: { $nin: ['cancelled'] },
    $or: [
      { billingStage: { $exists: false } },
      { billingStage: { $nin: ['cancelled'] } },
    ],
  })
    .select('plannedWorkIds')
    .lean()
    .exec();
  const alreadyBilledWorkIds = [];
  allInvoicesWithPlannedWork.forEach((inv) => {
    if (Array.isArray(inv.plannedWorkIds)) {
      inv.plannedWorkIds.forEach((id) => {
        const idStr = (id && (id._id || id).toString()) || '';
        if (idStr && !alreadyBilledWorkIds.some((b) => b.toString() === idStr)) {
          alreadyBilledWorkIds.push(id._id || id);
        }
      });
    }
  });

  const query = {
    removed: false,
    enabled: true,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };
  if (projectId) query.projectId = projectId;
  if (contractorId) query.contractorId = contractorId;
  if (alreadyBilledWorkIds.length > 0) {
    query._id = { $nin: alreadyBilledWorkIds };
  }

  const rawPlanned = await PlannedWork.find(query)
    .sort({ category: 1, buildingName: 1, unitNumber: 1 })
    .populate('projectId', 'name projectCode')
    .populate('contractorId', 'name')
    .lean()
    .exec();

  if (!rawPlanned || rawPlanned.length === 0) {
    return res.status(200).json({
      success: true,
      result: [],
      message: 'Planning data for billing (only 100% completed work; excluding already billed)',
    });
  }

  // Resolve projectId -> projectCode (Units store projectCode in projectId field)
  const isValidObjectId = (s) => typeof s === 'string' && /^[a-fA-F0-9]{24}$/.test(s);
  const projectIdsOrCodes = [...new Set(rawPlanned.map((pw) => (pw.projectId && (pw.projectId._id || pw.projectId)) && (pw.projectId._id || pw.projectId).toString()).filter(Boolean))];
  const projectIdToCode = {};
  const objectIdIds = projectIdsOrCodes.filter((id) => isValidObjectId(id));
  if (objectIdIds.length > 0) {
    const projects = await Project.find({ _id: { $in: objectIdIds.map((id) => new mongoose.Types.ObjectId(id)) } })
      .select('_id projectCode')
      .lean()
      .exec();
    projects.forEach((p) => {
      if (p._id && p.projectCode) projectIdToCode[p._id.toString()] = p.projectCode;
    });
  }
  projectIdsOrCodes.forEach((id) => {
    if (!projectIdToCode[id] && !isValidObjectId(id)) projectIdToCode[id] = id; // already a projectCode
  });

  // Build (projectIdOrCode, buildingName, unitNumber) -> unitId so we match the correct unit per building
  const unitKeys = new Set();
  rawPlanned.forEach((pw) => {
    const pid = (pw.projectId && (pw.projectId._id || pw.projectId)).toString();
    const projectCode = projectIdToCode[pid];
    if (!projectCode || !pw.unitNumber) return;
    const building = (pw.buildingName || pw.towerOrWing || '').trim();
    unitKeys.add(JSON.stringify({ projectCode, building, unitNumber: pw.unitNumber }));
  });

  const unitIdByKey = {};
  for (const keyStr of unitKeys) {
    const { projectCode, building, unitNumber } = JSON.parse(keyStr);
    const unitQuery = { projectId: projectCode, unitNumber, removed: { $ne: true } };
    if (building) unitQuery.$or = [{ buildingName: building }, { towerOrWing: building }];
    const unit = await Units.findOne(unitQuery).select('_id').lean().exec();
    if (unit) unitIdByKey[keyStr] = unit._id.toString();
  }

  const workTypes = [...new Set(rawPlanned.map((pw) => (pw.workType || pw.category || '').trim()).filter(Boolean))];
  const unitIds = [...new Set(Object.values(unitIdByKey))];
  if (unitIds.length === 0) {
    return res.status(200).json({
      success: true,
      result: [],
      message: 'Planning data for billing (only 100% completed work; excluding already billed)',
    });
  }

  const activityQuery = {
    removed: { $ne: true },
    progress: '100%',
    unitId: { $in: unitIds.map((id) => new mongoose.Types.ObjectId(id)) },
    activityName: { $in: workTypes },
  };
  if (projectId && isValidObjectId(projectId)) activityQuery.projectId = new mongoose.Types.ObjectId(projectId);
  if (contractorId && isValidObjectId(contractorId)) activityQuery.contractorId = new mongoose.Types.ObjectId(contractorId);

  const completedActivities = await Activities.find(activityQuery)
    .select('unitId activityName data photos')
    .lean()
    .exec();

  // Build both a set for filtering and a map for data/photos lookup
  const completedKeys = new Set();
  const activityDataByKey = {};
  completedActivities.forEach((a) => {
    const uid = (a.unitId && (a.unitId._id || a.unitId)).toString();
    const name = (a.activityName || '').trim().toLowerCase();
    const key = `${uid}|${name}`;
    completedKeys.add(key);
    activityDataByKey[key] = { data: a.data || {}, photos: a.photos || {} };
  });

  const result = rawPlanned.reduce((acc, pw) => {
    const pid = (pw.projectId && (pw.projectId._id || pw.projectId)).toString();
    const projectCode = projectIdToCode[pid];
    if (!projectCode) return acc;
    const building = (pw.buildingName || pw.towerOrWing || '').trim();
    const unitNumber = pw.unitNumber;
    const workType = (pw.workType || pw.category || '').trim();
    if (!workType) return acc;
    const keyStr = JSON.stringify({ projectCode, building, unitNumber });
    const uid = unitIdByKey[keyStr];
    if (!uid) return acc;
    const activityKey = `${uid}|${workType.toLowerCase()}`;
    if (!completedKeys.has(activityKey)) return acc;
    // Attach activity checklist data and photos onto the planned work row
    const activityMeta = activityDataByKey[activityKey] || {};
    acc.push({ ...pw, activityData: { data: activityMeta.data || {}, photos: activityMeta.photos || {} } });
    return acc;
  }, []);

  return res.status(200).json({
    success: true,
    result,
    message: 'Planning data for billing (only 100% completed work; excluding already billed)',
  });
};

module.exports = getPlanningForBilling;
