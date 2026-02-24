/**
 * RBAC: Role-Based Access Control
 * Source: roles and authority.xlsx (KCC ERP)
 * Roles: master, admin, pm, planner, site_engineer, store_incharge, accounts
 * Access: Full Access => all actions true; View Only => only view true; No Access => all false
 */

const ROLES = [
  'master',
  'admin',
  'pm',
  'planner',
  'site_engineer',
  'store_incharge',
  'accounts',
];

/** Normalize role from DB (e.g. 'owner' => master, 'Planner / Work Incharge' => planner) */
const ROLE_ALIAS = {
  owner: 'master',
  master: 'master',
  admin: 'admin',
  pm: 'pm',
  planner: 'planner',
  'planner / site incharge': 'planner',
  'planner / work incharge': 'planner',
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

/**
 * Granular permission matrix from KCC 24-02.csv. Planner = union of "Planner" and "Site Incharge".
 * Flat flags (view, create, edit, update, delete, approve) for route middleware.
 * Nested billing.invoice.* for granular API checks (auditCheck, finalCheck, markAsPaid, etc.).
 */
const T = true;
const F = false;
const inv = (vL, vS, cD, cDir, eD, uB, dB, audit, final, appr, adv, pen, hold, putHold, resume, pdf, paid, mail, plan) => ({
  viewBillList: vL, viewSingleBill: vS, createDraftBill: cD, createDirectBill: cDir, editDraftBill: eD, updateBill: uB, deleteBill: dB,
  auditCheck: audit, finalCheck: final, approval: appr, addAdvanceDeduction: adv, addPenalty: pen, addHold: hold, putOnHold: putHold, resumeFromHold: resume,
  generatePdf: pdf, markAsPaid: paid, sendMail: mail, getPlanningForBilling: plan,
});

const ROLE_PERMISSIONS = {
  master: {
    project_data: { view: T, create: T, edit: T, update: T, delete: T },
    planning: { view: T, create: T, edit: T, update: T, delete: T },
    work_progress: { view: T, create: T, edit: T, update: T, delete: T },
    inventory: { view: T, create: T, edit: T, update: T, delete: T },
    attendance: { view: T, create: T, edit: T, update: T, delete: T },
    staff_manage: { view: T, create: T, edit: T, update: T, delete: T },
    billing: { view: T, create: T, edit: T, update: T, delete: T, approve: T, invoice: inv(T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T) },
  },
  admin: {
    project_data: { view: T, create: T, edit: T, update: T, delete: T },
    planning: { view: T, create: T, edit: T, update: T, delete: T },
    work_progress: { view: T, create: T, edit: T, update: T, delete: T },
    inventory: { view: T, create: T, edit: T, update: T, delete: T },
    attendance: { view: T, create: T, edit: T, update: T, delete: T },
    staff_manage: { view: T, create: T, edit: T, update: T, delete: T },
    billing: { view: T, create: T, edit: T, update: T, delete: T, approve: T, invoice: inv(T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T) },
  },
  pm: {
    project_data: { view: T, create: F, edit: F, update: T, delete: F },
    planning: { view: T, create: T, edit: T, update: T, delete: T },
    work_progress: { view: T, create: T, edit: T, update: T, delete: T },
    inventory: { view: T, create: T, edit: T, update: T, delete: T },
    attendance: { view: T, create: T, edit: T, update: T, delete: T },
    staff_manage: { view: T, create: F, edit: F, update: F, delete: F },
    billing: { view: T, create: T, edit: T, update: T, delete: T, approve: T, invoice: inv(T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T) },
  },
  planner: {
    project_data: { view: T, create: F, edit: F, update: F, delete: F },
    planning: { view: T, create: T, edit: T, update: T, delete: T },
    work_progress: { view: T, create: T, edit: T, update: T, delete: T },
    inventory: { view: T, create: T, edit: T, update: T, delete: T },
    attendance: { view: T, create: T, edit: F, update: T, delete: F },
    staff_manage: { view: T, create: F, edit: F, update: F, delete: F },
    billing: { view: T, create: T, edit: T, update: F, delete: F, approve: T, invoice: inv(T,T,T,F,T,F,F,T,T,T,T,T,T,T,T,T,F,F,T) },
  },
  site_engineer: {
    project_data: { view: T, create: F, edit: F, update: F, delete: F },
    planning: { view: T, create: F, edit: F, update: F, delete: F },
    work_progress: { view: T, create: T, edit: T, update: T, delete: T },
    inventory: { view: T, create: F, edit: F, update: F, delete: F },
    attendance: { view: T, create: T, edit: F, update: T, delete: F },
    staff_manage: { view: T, create: F, edit: F, update: F, delete: F },
    billing: { view: T, create: F, edit: F, update: F, delete: F, approve: F, invoice: inv(T,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,T) },
  },
  store_incharge: {
    project_data: { view: T, create: F, edit: F, update: F, delete: F },
    planning: { view: T, create: F, edit: F, update: F, delete: F },
    work_progress: { view: T, create: F, edit: F, update: T, delete: F },
    inventory: { view: T, create: T, edit: T, update: T, delete: T },
    attendance: { view: T, create: T, edit: F, update: T, delete: F },
    staff_manage: { view: T, create: F, edit: F, update: F, delete: F },
    billing: { view: F, create: F, edit: F, update: F, delete: F, approve: F, invoice: inv(F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F) },
  },
  accounts: {
    project_data: { view: T, create: F, edit: F, update: F, delete: F },
    planning: { view: T, create: F, edit: F, update: F, delete: F },
    work_progress: { view: T, create: F, edit: F, update: F, delete: F },
    inventory: { view: T, create: T, edit: T, update: T, delete: T },
    attendance: { view: T, create: T, edit: F, update: T, delete: F },
    staff_manage: { view: T, create: F, edit: F, update: F, delete: F },
    billing: { view: T, create: T, edit: T, update: F, delete: F, approve: F, invoice: inv(T,T,F,T,T,F,F,T,T,F,T,T,T,T,T,T,T,T,T) },
  },
};

/**
 * Resolve role string to canonical key. Fail closed: unknown => null.
 */
function normalizeRole(role) {
  if (role == null || String(role).trim() === '') return null;
  const key = String(role).toLowerCase().trim().replace(/\s+/g, ' ');
  const byKey = ROLE_ALIAS[key];
  if (byKey) return byKey;
  const noSpaces = key.replace(/\s/g, '');
  const byNoSpaces = ROLE_ALIAS[noSpaces];
  if (byNoSpaces) return byNoSpaces;
  return ROLES.includes(key) ? key : null;
}

/** Get effective role from user (role or designation). Returns null if unknown. */
function getEffectiveRole(user) {
  if (!user) return null;
  const raw = user.role ?? user.designation;
  return normalizeRole(raw);
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

/**
 * Check granular permission (e.g. billing.invoice.markAsPaid). Fail closed.
 */
function hasGranularPermission(role, module, actionPath) {
  const r = role != null && ROLES.includes(role) ? role : normalizeRole(role);
  if (r == null) return false;
  const perms = ROLE_PERMISSIONS[r];
  if (!perms) return false;
  const mod = perms[module];
  if (!mod) return false;
  return getByPath(mod, actionPath) === true;
}

/**
 * Check module + action. Supports legacy (view, create, ...) and dotted paths. Fail closed.
 */
function hasPermission(role, module, action) {
  const r = role != null && ROLES.includes(role) ? role : normalizeRole(role);
  if (r == null) return false;
  const perms = ROLE_PERMISSIONS[r];
  if (!perms) return false;
  const mod = perms[module];
  if (!mod) return false;
  if (String(action).includes('.')) return getByPath(mod, action) === true;
  return mod[action] === true;
}

/**
 * Map API entity names (from routesList) to RBAC modules.
 * Used to protect appApi routes. Entities not listed are not permission-checked (e.g. backward compat).
 */
const ENTITY_TO_MODULE = {
  project: 'project_data',
  client: 'project_data',
  building: 'project_data',
  flat: 'project_data',
  unit: 'project_data',
  units: 'project_data',
  contractor: 'project_data',
  labourmaster: 'project_data',
  workrate: 'project_data',
  material: 'inventory',
  plannedwork: 'planning',
  activities: 'work_progress',
  workassign: 'work_progress',
  attendancerecord: 'attendance',
  staff: 'staff_manage',
  invoice: 'billing',
  payment: 'billing',
  quote: 'billing',
  checklist: 'billing',
  billingchecklist: 'billing',
  billingmethod: 'billing',
};

module.exports = {
  ROLES,
  ROLE_ALIAS,
  ROLE_PERMISSIONS,
  ENTITY_TO_MODULE,
  normalizeRole,
  getEffectiveRole,
  hasPermission,
  hasGranularPermission,
};
