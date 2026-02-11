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

/** Normalize role from DB (e.g. 'owner' => master, 'Planner / Site Incharge' => planner) */
const ROLE_ALIAS = {
  owner: 'master',
  master: 'master',
  admin: 'admin',
  pm: 'pm',
  planner: 'planner',
  'planner / site incharge': 'planner',
  site_engineer: 'site_engineer',
  'site engineer': 'site_engineer',
  store_incharge: 'store_incharge',
  'store incharge': 'store_incharge',
  accounts: 'accounts',
};

/**
 * Permission matrix derived from roles and authority.xlsx
 * Module keys: project_data, planning, work_progress, inventory, attendance, billing
 * Actions: create, edit, update, delete, view, approve (billing only)
 */
const ROLE_PERMISSIONS = {
  master: {
    project_data: { create: true, edit: true, update: true, delete: true, view: true },
    planning: { create: true, edit: true, update: true, delete: true, view: true },
    work_progress: { create: true, edit: true, update: true, delete: true, view: true },
    inventory: { create: true, edit: true, update: true, delete: true, view: true },
    attendance: { create: true, edit: true, update: true, delete: true, view: true },
    billing: { create: true, edit: true, update: true, delete: true, view: true, approve: true },
  },
  admin: {
    project_data: { create: true, edit: false, update: true, delete: false, view: true },
    planning: { create: true, edit: true, update: true, delete: true, view: true },
    work_progress: { create: true, edit: true, update: true, delete: true, view: true },
    inventory: { create: true, edit: true, update: true, delete: true, view: true },
    attendance: { create: true, edit: true, update: true, delete: true, view: true },
    billing: { create: true, edit: true, update: true, delete: true, view: true, approve: true },
  },
  pm: {
    project_data: { create: false, edit: false, update: false, delete: false, view: false },
    planning: { create: true, edit: true, update: true, delete: false, view: true },
    work_progress: { create: true, edit: true, update: true, delete: true, view: true },
    inventory: { create: true, edit: true, update: true, delete: true, view: true },
    attendance: { create: false, edit: false, update: false, delete: false, view: true },
    billing: { create: true, edit: true, update: true, delete: true, view: true, approve: true },
  },
  planner: {
    project_data: { create: false, edit: false, update: false, delete: false, view: false },
    planning: { create: true, edit: true, update: true, delete: false, view: true },
    work_progress: { create: false, edit: false, update: true, delete: false, view: true }, // View Only
    inventory: { create: false, edit: false, update: true, delete: false, view: true },   // Update Full, View Only
    attendance: { create: false, edit: false, update: false, delete: false, view: true }, // View Only
    billing: { create: true, edit: true, update: true, delete: false, view: true, approve: false },
  },
  site_engineer: {
    project_data: { create: false, edit: false, update: false, delete: false, view: false },
    planning: { create: false, edit: false, update: false, delete: false, view: true },   // View Only
    work_progress: { create: true, edit: true, update: true, delete: false, view: true },
    inventory: { create: false, edit: false, update: false, delete: false, view: true },  // View Only
    attendance: { create: true, edit: true, update: true, delete: false, view: true },
    billing: { create: false, edit: false, update: true, delete: false, view: true, approve: false }, // Update Full, View Only
  },
  store_incharge: {
    project_data: { create: false, edit: false, update: false, delete: false, view: false },
    planning: { create: false, edit: false, update: false, delete: false, view: true },    // View Only
    work_progress: { create: false, edit: false, update: false, delete: false, view: true }, // View Only
    inventory: { create: true, edit: true, update: true, delete: false, view: true },
    attendance: { create: false, edit: false, update: false, delete: false, view: false }, // No Access
    billing: { create: false, edit: false, update: false, delete: false, view: true, approve: false }, // View Only
  },
  accounts: {
    project_data: { create: false, edit: false, update: false, delete: false, view: false },
    planning: { create: false, edit: false, update: false, delete: false, view: true },    // View Only
    work_progress: { create: false, edit: false, update: false, delete: false, view: true }, // View Only
    inventory: { create: true, edit: true, update: true, delete: false, view: true },       // View Only
    attendance: { create: false, edit: false, update: false, delete: false, view: true }, // View Only
    billing: { create: false, edit: true, update: true, delete: false, view: true, approve: true },
  },
};

/**
 * Resolve role string to canonical key (for DB values like "Planner / Site Incharge")
 */
function normalizeRole(role) {
  if (!role) return 'site_engineer'; // safe default
  const key = String(role).toLowerCase().trim();
  return ROLE_ALIAS[key] || (ROLES.includes(key) ? key : 'site_engineer');
}

/**
 * Check if a role has permission for module + action
 * @param {string} role - Role name (from user.role)
 * @param {string} module - One of: project_data, planning, work_progress, inventory, attendance, billing
 * @param {string} action - One of: create, edit, update, delete, view, approve
 */
function hasPermission(role, module, action) {
  const r = normalizeRole(role);
  const perms = ROLE_PERMISSIONS[r];
  if (!perms) return false;
  const mod = perms[module];
  if (!mod) return false;
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
  contractor: 'project_data',
  labourmaster: 'project_data',
  plannedwork: 'planning',
  activities: 'work_progress',
  workassign: 'work_progress',
  attendancerecord: 'attendance',
  staff: 'attendance',
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
  hasPermission,
};
