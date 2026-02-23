/**
 * Master Dashboard Controller – MD Command Center
 * Unified summary API: Financials (Revenue, Dues, Expenses), Projects, Inventory, Work Progress, Activity Feed, Charts.
 * Optimized with MongoDB aggregations and Promise.all.
 */
const mongoose = require('mongoose');
const moment = require('moment');

const Invoice = mongoose.model('Invoice');
const Payment = mongoose.model('Payment');
const Project = mongoose.model('Project');
const ProjectInventory = mongoose.model('ProjectInventory');
const Activities = mongoose.model('Activities');
const PurchaseOrder = mongoose.model('PurchaseOrder');
const StockTransaction = mongoose.model('StockTransaction');
const StockRequirement = mongoose.model('StockRequirement');
const Admin = mongoose.model('Admin');

const STAFF_ROLES = ['pm', 'planner', 'site_engineer', 'store_incharge', 'accounts', 'admin', 'master'];
const LOW_STOCK_THRESHOLD = 5;
const BIG_PAYMENT_THRESHOLD = 50000;
const LARGE_PO_THRESHOLD = 100000;

function progressToNumber(progress) {
  if (!progress) return 0;
  const match = String(progress).match(/^(\d+)%?$/);
  return match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : 0;
}

/**
 * GET /dashboard/summary
 */
const summary = async (req, res) => {
  try {
    const baseMatch = { removed: false };
    const now = new Date();

    const [
      financials,
      projectsSummary,
      inventorySummary,
      workCompletion,
      activeProjectsList,
      recentActivity,
      billingCollectionMonthly,
      projectDistribution,
      alertsAndStaff,
    ] = await Promise.all([
      // ─── Financials: Total Revenue (Collected), Outstanding Dues, Total Expenses (PO) ───
      (async () => {
        const [billedRes, paidRes, outstandingRes, expensesRes] = await Promise.all([
          Invoice.aggregate([
            { $match: { ...baseMatch, status: { $nin: ['cancelled'] } } },
            { $group: { _id: null, total: { $sum: '$total' } } },
            { $project: { _id: 0, totalBilled: '$total' } },
          ]),
          Payment.aggregate([
            { $match: baseMatch },
            { $group: { _id: null, total: { $sum: '$amount' } } },
            { $project: { _id: 0, totalPaid: '$total' } },
          ]),
          Invoice.aggregate([
            {
              $match: {
                ...baseMatch,
                status: { $nin: ['cancelled'] },
                paymentStatus: { $in: ['unpaid', 'partially'] },
              },
            },
            { $group: { _id: null, total: { $sum: { $subtract: ['$total', { $ifNull: ['$credit', 0] }] } } } },
            { $project: { _id: 0, outstandingDues: '$total' } },
          ]),
          PurchaseOrder.aggregate([
            { $match: { ...baseMatch, status: { $in: ['Issued', 'Received', 'Closed'] } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$totalAmount', 0] } } } },
            { $project: { _id: 0, totalExpenses: '$total' } },
          ]),
        ]);
        return {
          totalBilled: billedRes[0]?.totalBilled ?? 0,
          totalRevenue: paidRes[0]?.totalPaid ?? 0,
          totalPaid: paidRes[0]?.totalPaid ?? 0,
          outstandingDues: outstandingRes[0]?.outstandingDues ?? 0,
          totalExpenses: expensesRes[0]?.totalExpenses ?? 0,
        };
      })(),

      // ─── Projects: Planning / Execution / Complete counts, Budget vs Actual ───
      (async () => {
        const [counts, budgetActual] = await Promise.all([
          Project.aggregate([
            { $match: baseMatch },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ]),
          Project.aggregate([
            { $match: baseMatch },
            {
              $group: {
                _id: null,
                totalBudget: { $sum: '$budget' },
                totalActualSpend: { $sum: { $ifNull: ['$actualTotalCost', 0] } },
              },
            },
            { $project: { _id: 0, totalBudget: 1, totalActualSpend: 1 } },
          ]),
        ]);
        const statusMap = Object.fromEntries((counts || []).map((s) => [s._id, s.count]));
        const planningCount = statusMap['Planning'] ?? 0;
        const executionCount = statusMap['Execution'] ?? 0;
        const completedCount = statusMap['Complete'] ?? 0;
        const activeCount = planningCount + executionCount;
        const ba = budgetActual[0] || {};
        return {
          planningCount,
          executionCount,
          completedCount,
          activeCount,
          totalBudget: ba.totalBudget ?? 0,
          totalActualSpend: ba.totalActualSpend ?? 0,
        };
      })(),

      // ─── Inventory: Total Stock Value, Low Stock Count ───
      (async () => {
        const [valueResult, lowStockResult] = await Promise.all([
          ProjectInventory.aggregate([
            { $match: baseMatch },
            {
              $group: {
                _id: null,
                totalValue: {
                  $sum: { $multiply: [{ $ifNull: ['$currentStock', 0] }, { $ifNull: ['$avgRate', 0] }] },
                },
              },
            },
            { $project: { _id: 0, totalStockValue: '$totalValue' } },
          ]),
          ProjectInventory.countDocuments({
            ...baseMatch,
            currentStock: { $lte: LOW_STOCK_THRESHOLD },
          }),
        ]);
        return {
          totalStockValue: valueResult[0]?.totalStockValue ?? 0,
          criticalLowStockCount: lowStockResult ?? 0,
        };
      })(),

      // ─── Work Progress: Average completion % across active projects ───
      (async () => {
        const activeProjectIds = await Project.find(
          { ...baseMatch, status: { $in: ['Planning', 'Execution'] } },
          { _id: 1 }
        ).distinct('_id');
        if (activeProjectIds.length === 0) return { overallCompletionPercent: 0 };
        const list = await Activities.find(
          { ...baseMatch, projectId: { $in: activeProjectIds } },
          { progress: 1 }
        ).lean();
        let sum = 0, n = 0;
        list.forEach((a) => { sum += progressToNumber(a.progress); n += 1; });
        return { overallCompletionPercent: n > 0 ? Math.round((sum / n) * 10) / 10 : 0 };
      })(),

      // ─── Active projects list (for grid) ───
      (async () => {
        const projects = await Project.find(
          { ...baseMatch, status: { $in: ['Planning', 'Execution'] } },
          { name: 1, status: 1, projectCode: 1, budget: 1, actualTotalCost: 1 }
        )
          .sort({ updated: -1 })
          .lean();
        const projectIds = projects.map((p) => p._id);
        const completionByProject = await Activities.aggregate([
          { $match: { ...baseMatch, projectId: { $in: projectIds } } },
          {
            $project: {
              projectId: 1,
              num: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$progress', '100%'] }, then: 100 },
                    { case: { $eq: ['$progress', '75%'] }, then: 75 },
                    { case: { $eq: ['$progress', '50%'] }, then: 50 },
                    { case: { $eq: ['$progress', '25%'] }, then: 25 },
                    { case: { $eq: ['$progress', '0%'] }, then: 0 },
                  ],
                  default: 0,
                },
              },
            },
          },
          { $group: { _id: '$projectId', avg: { $avg: '$num' } } },
        ]);
        const completionMap = Object.fromEntries(completionByProject.map((c) => [c._id.toString(), c.avg]));
        return projects.map((p) => ({
          _id: p._id,
          name: p.name,
          projectCode: p.projectCode,
          status: p.status,
          completionPercent: Math.round((completionMap[p._id.toString()] ?? 0) * 10) / 10,
          budget: p.budget,
          actualTotalCost: p.actualTotalCost ?? 0,
        }));
      })(),

      // ─── Recent Activity: last 5 major events (New Project, Big Payment, Large PO, Bill, Material) ───
      (async () => {
        const [recentProjects, recentPayments, recentPOs, recentInvoices, recentGRN] = await Promise.all([
          Project.find(baseMatch, { created: 1, name: 1 }).sort({ created: -1 }).limit(5).lean(),
          Payment.find(baseMatch, { created: 1, amount: 1, number: 1 }).sort({ created: -1 }).limit(5).lean(),
          PurchaseOrder.find({ ...baseMatch, status: 'Issued' }, { created: 1, updated: 1, number: 1, year: 1, totalAmount: 1 }).sort({ updated: -1 }).limit(5).lean(),
          Invoice.find({ ...baseMatch, status: { $nin: ['cancelled'] } }, { created: 1, number: 1, year: 1 }).sort({ created: -1 }).limit(5).lean(),
          StockTransaction.find({ ...baseMatch, type: 'IN' }, { date: 1, projectId: 1 }).sort({ date: -1 }).limit(5).populate('projectId', 'name').lean(),
        ]);
        const events = [
          ...recentProjects.map((p) => ({ date: p.created, type: 'new_project', label: 'New Project', meta: p.name })),
          ...recentPayments.map((p) => ({
            date: p.created,
            type: 'payment',
            label: p.amount >= BIG_PAYMENT_THRESHOLD ? 'Large Payment to Contractor' : 'Payment to Contractor',
            meta: `₹${Number(p.amount).toLocaleString()}`,
          })),
          ...recentPOs.map((po) => ({
            date: po.updated || po.created,
            type: 'po',
            label: (po.totalAmount || 0) >= LARGE_PO_THRESHOLD ? 'Large PO Issued' : 'PO Issued',
            meta: `PO #${po.number}/${po.year}`,
          })),
          ...recentInvoices.map((i) => ({ date: i.created, type: 'bill', label: 'Bill Created', meta: `#${i.number}/${i.year}` })),
          ...recentGRN.map((t) => ({ date: t.date, type: 'grn', label: 'Material Received', meta: t.projectId?.name || 'Site' })),
        ];
        events.sort((a, b) => new Date(b.date) - new Date(a.date));
        return events.slice(0, 5).map((e) => ({ ...e, date: e.date }));
      })(),

      // ─── Billing vs Collection (last 6 months) ───
      (async () => {
        const result = [];
        for (let i = 5; i >= 0; i--) {
          const start = moment().subtract(i, 'months').startOf('month').toDate();
          const end = moment().subtract(i, 'months').endOf('month').toDate();
          const [billing, collection] = await Promise.all([
            Invoice.aggregate([
              { $match: { ...baseMatch, status: { $nin: ['cancelled'] }, date: { $gte: start, $lte: end } } },
              { $group: { _id: null, total: { $sum: '$total' } } },
              { $project: { _id: 0, total: 1 } },
            ]),
            Payment.aggregate([
              { $match: { ...baseMatch, date: { $gte: start, $lte: end } } },
              { $group: { _id: null, total: { $sum: '$amount' } } },
              { $project: { _id: 0, total: 1 } },
            ]),
          ]);
          result.push({
            month: moment(start).format('MMM YYYY'),
            billing: billing[0]?.total ?? 0,
            collection: collection[0]?.total ?? 0,
          });
        }
        return result;
      })(),

      // ─── Project distribution by status (Planning / Execution / Complete) for donut ───
      (async () => {
        const counts = await Project.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const order = ['Planning', 'Execution', 'Complete'];
        return order.map((status) => ({
          name: status,
          value: counts.find((c) => c._id === status)?.count ?? 0,
        })).filter((d) => d.value > 0);
      })(),

      // ─── Alerts: Pending Indents, Overdue Bills; Staff count ───
      (async () => {
        const [pendingIndents, overdueBills, staff] = await Promise.all([
          StockRequirement.countDocuments({ ...baseMatch, status: 'Pending' }),
          Invoice.countDocuments({
            ...baseMatch,
            status: { $nin: ['cancelled'] },
            paymentStatus: { $in: ['unpaid', 'partially'] },
            expiredDate: { $lt: now },
          }),
          Admin.countDocuments({ removed: false, role: { $in: STAFF_ROLES } }),
        ]);
        return { pendingIndents, overdueBills, staffCount: staff };
      })(),
    ]);

    return res.status(200).json({
      success: true,
      result: {
        financials: {
          ...financials,
          totalRevenue: financials.totalPaid,
        },
        projects: projectsSummary,
        inventory: inventorySummary,
        work: workCompletion,
        activeProjectsList,
        recentActivity,
        billingCollectionMonthly,
        projectDistribution,
        alerts: {
          pendingIndents: alertsAndStaff?.pendingIndents ?? 0,
          overdueBills: alertsAndStaff?.overdueBills ?? 0,
        },
        staffCount: alertsAndStaff?.staffCount ?? 0,
      },
      message: 'Dashboard summary retrieved successfully',
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    return res.status(500).json({
      success: false,
      result: null,
      message: err.message || 'Failed to load dashboard summary',
    });
  }
};

module.exports = { summary };
