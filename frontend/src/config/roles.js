/**
 * RBAC: Strict fail-closed. Source of truth: KCC 24-02.csv.
 * If a role, module, or action is not explicitly true, MUST return false.
 */

export const ROLES = [
  'master',
  'admin',
  'pm',
  'planner',
  'site_engineer',
  'store_incharge',
  'accounts',
];

export const LOGIN_PROFILES = [
  { role: 'admin', label: 'Admin', email: 'admin@kcc.com' },
  { role: 'master', label: 'Master', email: 'master@kcc.com' },
  { role: 'pm', label: 'PM', email: 'pm@kcc.com' },
  { role: 'planner', label: 'Planner / Work Incharge', email: 'planner@kcc.com' },
  { role: 'site_engineer', label: 'Site Engineer', email: 'site_engineer@kcc.com' },
  { role: 'store_incharge', label: 'Store Incharge', email: 'store_incharge@kcc.com' },
  { role: 'accounts', label: 'Accounts', email: 'accounts@kcc.com' },
];

/** Backend sends role or designation (e.g. "Store Incharge", "Site Engineer"). Map to canonical key. */
const ROLE_ALIAS = {
  owner: 'master',
  master: 'master',
  admin: 'admin',
  pm: 'pm',
  planner: 'planner',
  'planner / site incharge': 'planner',
  'planner / work incharge': 'planner',
  'planner/site incharge': 'planner',
  'planner/work incharge': 'planner',
  'site incharge': 'planner',
  siteincharge: 'planner',
  site_engineer: 'site_engineer',
  'site engineer': 'site_engineer',
  siteengineer: 'site_engineer',
  store_incharge: 'store_incharge',
  'store incharge': 'store_incharge',
  storeincharge: 'store_incharge',
  accounts: 'accounts',
};

const _t = true;
const _f = false;

const billingInvoice = (a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s) => ({
  viewBillList: a, viewSingleBill: b, createDraftBill: c, createDirectBill: d, editDraftBill: e, updateBill: f, deleteBill: g,
  auditCheck: h, finalCheck: i, approval: j, addAdvanceDeduction: k, addPenalty: l, addHold: m, putOnHold: n, resumeFromHold: o,
  generatePdf: p, markAsPaid: q, sendMail: r, getPlanningForBilling: s,
});

const billingDashboard = (view, fromPlanning, direct, allBills) => ({
  viewBillingDashboard: view, accessCreateBillFromPlanning: fromPlanning, accessDirectBill: direct, accessAllBillsList: allBills,
});

const projectDataFlat = (view, create, edit, update, del) => ({ view, create, edit, update, delete: del });

/** Balance Work export (CSV: Export Balance Work Excel / Export Balance Work PDF). */
const balanceWork = (exportExcel, exportPdf) => ({ exportExcel, exportPdf });

/** Inventory sub-areas (CSV: Generate PO PDF = Master, Admin, Store Incharge, Accounts only). */
const purchaseOrder = (generatePdf) => ({ generatePdf });

/** Empty permissions for unknown/guest role. Fail closed. */
const EMPTY_PERMISSIONS = Object.freeze({
  project_data: { view: false, create: false, edit: false, update: false, delete: false },
  planning: { view: false, create: false, edit: false, update: false, delete: false, report: { exportPdf: false } },
    work_progress: { view: false, create: false, edit: false, update: false, delete: false, balanceWork: balanceWork(false, false) },
  inventory: { view: false, create: false, edit: false, update: false, delete: false, grn: { viewList: false }, indent: { viewList: false }, purchaseOrder: purchaseOrder(false) },
  attendance: { view: false, create: false, edit: false, update: false, delete: false },
  billing: { view: false, create: false, edit: false, update: false, delete: false, approve: false },
  staff_manage: { view: false, create: false, edit: false, update: false, delete: false },
});

export const ROLE_PERMISSIONS = {
  master: {
    project_data: { view: _t, create: _t, edit: _t, update: _t, delete: _t, projects: projectDataFlat(_t,_t,_t,_t,_t), customer: projectDataFlat(_t,_t,_t,_t,_t), units: projectDataFlat(_t,_t,_t,_t,_t), setRate: { viewRateList:_t, createEditSetRates:_t, updateRates:_t, deleteRate:_t, importRatesFromExcel:_t, getRateForActivity:_t }, vendor: projectDataFlat(_t,_t,_t,_t,_t) },
    planning: { view: _t, create: _t, edit: _t, update: _t, delete: _t, report: { exportPdf: _t } },
    work_progress: { view: _t, create: _t, edit: _t, update: _t, delete: _t, balanceWork: balanceWork(_t,_t) },
    inventory: { view: _t, create: _t, edit: _t, update: _t, delete: _t, grn: { viewList: _t }, indent: { viewList: _t }, purchaseOrder: purchaseOrder(_t) },
    attendance: { view: _t, create: _t, edit: _t, update: _t, delete: _t },
    staff_manage: { view: _t, create: _t, edit: _t, update: _t, delete: _t },
    billing: { view: _t, create: _t, edit: _t, update: _t, delete: _t, approve: _t, dashboard: billingDashboard(_t,_t,_t,_t), invoice: billingInvoice(_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t) },
  },
  admin: {
    project_data: { view: _t, create: _t, edit: _t, update: _t, delete: _t, projects: projectDataFlat(_t,_t,_t,_t,_f), customer: projectDataFlat(_t,_t,_t,_t,_t), units: projectDataFlat(_t,_t,_t,_t,_t), setRate: { viewRateList:_t, createEditSetRates:_t, updateRates:_t, deleteRate:_t, importRatesFromExcel:_t, getRateForActivity:_t }, vendor: projectDataFlat(_t,_t,_t,_t,_t) },
    planning: { view: _t, create: _t, edit: _t, update: _t, delete: _t, report: { exportPdf: _t } },
    work_progress: { view: _t, create: _t, edit: _t, update: _t, delete: _t, balanceWork: balanceWork(_t,_t) },
    inventory: { view: _t, create: _t, edit: _t, update: _t, delete: _t, grn: { viewList: _t }, indent: { viewList: _t }, purchaseOrder: purchaseOrder(_t) },
    attendance: { view: _t, create: _t, edit: _t, update: _t, delete: _t },
    staff_manage: { view: _t, create: _t, edit: _t, update: _t, delete: _t },
    billing: { view: _t, create: _t, edit: _t, update: _t, delete: _t, approve: _t, dashboard: billingDashboard(_t,_t,_t,_t), invoice: billingInvoice(_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t) },
  },
  pm: {
    project_data: { view: _t, create: _f, edit: _f, update: _t, delete: _f, projects: projectDataFlat(_t,_f,_f,_t,_f), customer: projectDataFlat(_t,_f,_f,_t,_f), units: projectDataFlat(_t,_f,_f,_f,_f), setRate: { viewRateList:_t, createEditSetRates:_f, updateRates:_t, deleteRate:_t, importRatesFromExcel:_t, getRateForActivity:_t }, vendor: projectDataFlat(_t,_t,_t,_t,_f) },
    planning: { view: _t, create: _t, edit: _t, update: _t, delete: _t, report: { exportPdf: _t } },
    work_progress: { view: _t, create: _t, edit: _t, update: _t, delete: _t, balanceWork: balanceWork(_t,_t) },
    inventory: { view: _t, create: _t, edit: _t, update: _t, delete: _t, grn: { viewList: _t }, indent: { viewList: _t }, purchaseOrder: purchaseOrder(_f) },
    attendance: { view: _t, create: _t, edit: _t, update: _t, delete: _t },
    staff_manage: { view: _t, create: _f, edit: _f, update: _f, delete: _f },
    billing: { view: _t, create: _t, edit: _t, update: _t, delete: _t, approve: _t, dashboard: billingDashboard(_t,_t,_t,_t), invoice: billingInvoice(_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t,_t) },
  },
  planner: {
    project_data: { view: _t, create: _f, edit: _f, update: _f, delete: _f, projects: projectDataFlat(_t,_f,_f,_f,_f), customer: projectDataFlat(_t,_f,_f,_f,_f), units: projectDataFlat(_t,_f,_f,_f,_f), setRate: { viewRateList:_t, createEditSetRates:_f, updateRates:_f, deleteRate:_f, importRatesFromExcel:_t, getRateForActivity:_t }, vendor: projectDataFlat(_t,_f,_f,_f,_f) },
    planning: { view: _t, create: _t, edit: _t, update: _t, delete: _t, report: { exportPdf: _t } },
    work_progress: { view: _t, create: _t, edit: _t, update: _t, delete: _t, balanceWork: balanceWork(_t,_t) },
    inventory: { view: _t, create: _t, edit: _t, update: _t, delete: _t, grn: { viewList: _f }, indent: { viewList: _t }, purchaseOrder: purchaseOrder(_f) },
    attendance: { view: _t, create: _t, edit: _f, update: _t, delete: _f },
    staff_manage: { view: _t, create: _f, edit: _f, update: _f, delete: _f },
    billing: { view: _t, create: _t, edit: _t, update: _f, delete: _f, approve: _t, dashboard: billingDashboard(_t,_t,_f,_t), invoice: billingInvoice(_t,_t,_t,_f,_t,_f,_f,_t,_t,_t,_t,_t,_t,_t,_t,_t,_f,_f,_t) },
  },
  site_engineer: {
    project_data: { view: _t, create: _f, edit: _f, update: _f, delete: _f, projects: projectDataFlat(_t,_f,_f,_f,_f), customer: projectDataFlat(_t,_f,_f,_f,_f), units: projectDataFlat(_t,_f,_f,_f,_f), setRate: { viewRateList:_t, createEditSetRates:_f, updateRates:_f, deleteRate:_f, importRatesFromExcel:_t, getRateForActivity:_t }, vendor: projectDataFlat(_t,_f,_f,_f,_f) },
    planning: { view: _t, create: _f, edit: _f, update: _f, delete: _f, report: { exportPdf: _t } },
    work_progress: { view: _t, create: _t, edit: _t, update: _t, delete: _t, balanceWork: balanceWork(_f,_t) },
    inventory: { view: _t, create: _f, edit: _f, update: _f, delete: _f, grn: { viewList: _f }, indent: { viewList: _f }, purchaseOrder: purchaseOrder(_f) },
    attendance: { view: _t, create: _t, edit: _f, update: _t, delete: _f },
    staff_manage: { view: _t, create: _f, edit: _f, update: _f, delete: _f },
    billing: { view: _t, create: _f, edit: _f, update: _f, delete: _f, approve: _f, dashboard: billingDashboard(_f,_f,_f,_f), invoice: billingInvoice(_t,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_t) },
  },
  store_incharge: {
    project_data: { view: _t, create: _f, edit: _f, update: _f, delete: _f, projects: projectDataFlat(_t,_f,_f,_f,_f), customer: projectDataFlat(_t,_f,_f,_f,_f), units: projectDataFlat(_t,_f,_f,_f,_f), setRate: { viewRateList:_f, createEditSetRates:_f, updateRates:_f, deleteRate:_f, importRatesFromExcel:_f, getRateForActivity:_f }, vendor: projectDataFlat(_t,_f,_f,_f,_f) },
    planning: { view: _t, create: _f, edit: _f, update: _f, delete: _f, report: { exportPdf: _t } },
    work_progress: { view: _t, create: _f, edit: _f, update: _t, delete: _f, balanceWork: balanceWork(_f,_f) },
    inventory: { view: _t, create: _t, edit: _t, update: _t, delete: _t, grn: { viewList: _t }, indent: { viewList: _t }, purchaseOrder: purchaseOrder(_t) },
    attendance: { view: _t, create: _t, edit: _f, update: _t, delete: _f },
    staff_manage: { view: _t, create: _f, edit: _f, update: _f, delete: _f },
    billing: { view: _f, create: _f, edit: _f, update: _f, delete: _f, approve: _f, dashboard: billingDashboard(_f,_f,_f,_f), invoice: billingInvoice(_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f,_f) },
  },
  accounts: {
    project_data: { view: _t, create: _f, edit: _f, update: _f, delete: _f, projects: projectDataFlat(_t,_f,_f,_f,_f), customer: projectDataFlat(_t,_f,_f,_f,_f), units: projectDataFlat(_t,_f,_f,_f,_f), setRate: { viewRateList:_t, createEditSetRates:_t, updateRates:_t, deleteRate:_t, importRatesFromExcel:_t, getRateForActivity:_t }, vendor: projectDataFlat(_t,_t,_t,_t,_f) },
    planning: { view: _t, create: _f, edit: _f, update: _f, delete: _f, report: { exportPdf: _t } },
    work_progress: { view: _t, create: _f, edit: _f, update: _f, delete: _f, balanceWork: balanceWork(_t,_t) },
    inventory: { view: _t, create: _t, edit: _t, update: _t, delete: _t, grn: { viewList: _t }, indent: { viewList: _t }, purchaseOrder: purchaseOrder(_t) },
    attendance: { view: _t, create: _t, edit: _f, update: _t, delete: _f },
    staff_manage: { view: _t, create: _f, edit: _f, update: _f, delete: _f },
    billing: { view: _t, create: _t, edit: _t, update: _f, delete: _f, approve: _f, dashboard: billingDashboard(_t,_t,_t,_t), invoice: billingInvoice(_t,_t,_f,_t,_t,_f,_f,_t,_t,_f,_t,_t,_t,_t,_t,_t,_t,_t,_t) },
  },
  guest: EMPTY_PERMISSIONS,
};

const ALLOW_ALL_MODULE = '_allow_all';
const allowAllPerms = { create: true, edit: true, update: true, delete: true, view: true, approve: true };
ROLES.forEach((r) => {
  ROLE_PERMISSIONS[r][ALLOW_ALL_MODULE] = allowAllPerms;
});

export const MENU_WHITELIST_KEYS = new Set(['dashboard', 'about']);

/**
 * Normalize backend role/designation to canonical key. Fail closed: unknown → null.
 * Strip all whitespace, lowercase, try alias then ROLES.
 */
export function normalizeRole(role) {
  if (role === undefined || role === null) return null;
  const s = String(role).trim();
  if (s === '') return null;
  const lower = s.toLowerCase().replace(/\s+/g, ' ').trim();
  const noSpaces = lower.replace(/\s+/g, '');
  const withUnderscore = lower.replace(/\s+/g, '_');
  if (ROLE_ALIAS[lower] !== undefined) return ROLE_ALIAS[lower];
  if (ROLE_ALIAS[withUnderscore] !== undefined) return ROLE_ALIAS[withUnderscore];
  if (ROLE_ALIAS[noSpaces] !== undefined) return ROLE_ALIAS[noSpaces];
  if (ROLES.includes(lower)) return lower;
  if (ROLES.includes(withUnderscore)) return withUnderscore;
  return null;
}

/**
 * Effective role from auth.current. Uses role ?? designation. Unknown → null (fail closed).
 */
export function getEffectiveRole(currentUser) {
  if (!currentUser || typeof currentUser !== 'object') return null;
  const raw = currentUser.role ?? currentUser.designation;
  if (raw === undefined || raw === null) return null;
  return normalizeRole(raw);
}

/**
 * Permissions for role. Unknown role → EMPTY_PERMISSIONS (guest). Never undefined.
 */
export function getPermissionsForRole(role) {
  const key = normalizeRole(role);
  if (key === null) return EMPTY_PERMISSIONS;
  if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, key)) return EMPTY_PERMISSIONS;
  return ROLE_PERMISSIONS[key];
}

function getByPath(obj, pathStr) {
  if (!obj || !pathStr) return undefined;
  const parts = String(pathStr).split('.');
  let cur = obj;
  for (const p of parts) {
    cur = cur?.[p];
    if (cur === undefined) return undefined;
  }
  return cur;
}

/** Fail closed: only explicit true. Default false for missing/unknown. */
export function hasGranularPermission(role, module, actionPath) {
  const perms = getPermissionsForRole(role);
  const mod = perms[module];
  if (!mod) return false;
  const val = getByPath(mod, actionPath);
  return val === true;
}

export function hasPermission(role, module, action) {
  const perms = getPermissionsForRole(role);
  const mod = perms[module];
  if (!mod) return false;
  if (String(action).includes('.')) return getByPath(mod, action) === true;
  return mod[action] === true;
}

/**
 * Module-level view. Fail closed: only true if perms[module].view === true.
 */
export function canAccessModule(role, moduleName) {
  if (!moduleName || typeof moduleName !== 'string') return false;
  const perms = getPermissionsForRole(role);
  const mod = perms[moduleName];
  if (!mod) return false;
  return mod.view === true;
}

export { ALLOW_ALL_MODULE };

export const ENTITY_TO_MODULE = {
  project: 'project_data',
  client: 'project_data',
  building: 'project_data',
  flat: 'project_data',
  unit: 'project_data',
  units: 'project_data',
  contractor: 'project_data',
  labourmaster: 'project_data',
  workrate: 'project_data',
  plannedwork: 'planning',
  activities: 'work_progress',
  workassign: 'work_progress',
  attendancerecord: 'attendance',
  staff: 'staff_manage',
  labour: 'attendance',
  invoice: 'billing',
  payment: 'billing',
  quote: 'billing',
  supplier: 'inventory',
  material: 'inventory',
  stockrequirement: 'inventory',
  purchaseorder: 'inventory',
  stocktransaction: 'inventory',
  sitetransfer: 'inventory',
  projectinventory: 'inventory',
  'inventory/requirement': 'inventory',
  'inventory/purchase-order': 'inventory',
  'inventory/transaction': 'inventory',
  'inventory/site-transfer': 'inventory',
  'inventory/supplier': 'inventory',
};

export const MENU_MODULE_MAP = {
  dashboard: null,
  customer: 'project_data',
  units: 'project_data',
  /* work-module intentionally unmapped: children span planning, work_progress, project_data; parent drops only when no children visible */
  'work/planning': 'planning',
  'work/wip': 'work_progress',
  'work/balance-work': 'work_progress',
  'work/set-rate': 'project_data',
  'attendance-module': 'attendance',
  attendance: 'attendance',
  labour: 'attendance',
  'attendance/manage-company-staff': 'staff_manage',
  vendor: 'attendance',
  'inventory-module': 'inventory',
  inventory: 'inventory',
  'inventory/materials': 'inventory',
  'inventory/indent': 'inventory',
  'inventory/purchase-order': 'inventory',
  'inventory/grn': 'inventory',
  'inventory/consumption': 'inventory',
  'inventory/site-transfer': 'inventory',
  'inventory/supplier': 'inventory',
  'billing-module': 'billing',
  billing: 'billing',
  'billing/planning': 'billing',
  'billing/direct': 'billing',
  invoice: 'billing',
  about: null,
};

/** Menu keys that require a granular permission (fail-closed: hide if not explicitly true). */
export const MENU_ITEM_GRANULAR = {
  'billing/planning': ['billing', 'dashboard.accessCreateBillFromPlanning'],
  'billing/direct': ['billing', 'dashboard.accessDirectBill'],
  invoice: ['billing', 'dashboard.accessAllBillsList'],
  'work/set-rate': ['project_data', 'setRate.viewRateList'],
  'inventory/grn': ['inventory', 'grn.viewList'],
  'inventory/indent': ['inventory', 'indent.viewList'],
};

export const PATH_TO_MODULE = {
  '/customer': 'project_data',
  '/units': 'project_data',
  '/projects': 'project_data',
  '/work/set-rate': 'project_data',
  '/work/planning': 'planning',
  '/work/wip': 'work_progress',
  '/work/balance-work': 'work_progress',
  '/attendance': 'attendance',
  '/labour': 'attendance',
  '/attendance/manage-company-staff': 'staff_manage',
  '/vendor': 'attendance',
  '/inventory': 'inventory',
  '/billing/planning': 'billing',
  '/billing/direct': 'billing',
  '/billing': 'billing',
  '/invoice': 'billing',
  '/profile': null,
};
