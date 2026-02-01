const mongoose = require('mongoose');

const PlannedWork = mongoose.model('PlannedWork');

/**
 * GET /invoice/planning-for-billing
 * Query: weekEnd (ISO date, Saturday), projectId, contractorId
 * Returns planned work for that week (week ending Saturday) for billing chart.
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

  const query = {
    removed: false,
    enabled: true,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };

  if (projectId) query.projectId = projectId;
  if (contractorId) query.contractorId = contractorId;

  const result = await PlannedWork.find(query)
    .sort({ category: 1, buildingName: 1, unitNumber: 1 })
    .populate('projectId', 'name projectCode')
    .populate('contractorId', 'name')
    .exec();

  return res.status(200).json({
    success: true,
    result,
    message: 'Planning data for billing',
  });
};

module.exports = getPlanningForBilling;
