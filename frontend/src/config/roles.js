/**
 * RBAC: MUST match roles and authority.xlsx (client source of truth).
 * Mirrors backend config/roles.js. Update ROLE_PERMISSIONS when the Excel changes.
 * Used for UI: sidebar visibility, button visibility (Create/Edit/Delete).
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

/** Netflix-style login: Admin first, then other roles. Email = role@kcc.com */
export const LOGIN_PROFILES = [
  { role: 'admin', label: 'Admin', email: 'admin@kcc.com' },
  { role: 'master', label: 'Master', email: 'master@kcc.com' },
  { role: 'pm', label: 'PM', email: 'pm@kcc.com' },
  { role: 'planner', label: 'Planner', email: 'planner@kcc.com' },
  { role: 'site_engineer', label: 'Site Engineer', email: 'site_engineer@kcc.com' },
  { role: 'store_incharge', label: 'Store Incharge', email: 'store_incharge@kcc.com' },
  { role: 'accounts', label: 'Accounts', email: 'accounts@kcc.com' },
];

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

export const ROLE_PERMISSIONS = {
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
    project_data: { create: false, edit: false, update: false, delete: false, view: true },
    planning: { create: true, edit: true, update: true, delete: false, view: true },
    work_progress: { create: true, edit: true, update: true, delete: true, view: true },
    inventory: { create: true, edit: true, update: true, delete: true, view: true },
    attendance: { create: false, edit: false, update: false, delete: false, view: true },
    billing: { create: true, edit: true, update: true, delete: false, view: true, approve: true },
  },
  planner: {
    project_data: { create: false, edit: false, update: false, delete: false, view: true },
    planning: { create: true, edit: true, update: true, delete: false, view: true },
    work_progress: { create: false, edit: false, update: true, delete: false, view: true },
    inventory: { create: false, edit: false, update: true, delete: false, view: true },
    attendance: { create: false, edit: false, update: false, delete: false, view: true },
    billing: { create: true, edit: true, update: true, delete: false, view: true, approve: false },
  },
  site_engineer: {
    project_data: { create: false, edit: false, update: false, delete: false, view: true },
    planning: { create: false, edit: false, update: false, delete: false, view: true },
    work_progress: { create: true, edit: true, update: true, delete: false, view: true },
    inventory: { create: false, edit: false, update: false, delete: false, view: true },
    attendance: { create: true, edit: true, update: true, delete: false, view: true },
    billing: { create: false, edit: false, update: false, delete: false, view: false, approve: false },
  },
  store_incharge: {
    project_data: { create: false, edit: false, update: false, delete: false, view: true },
    planning: { create: false, edit: false, update: false, delete: false, view: true },
    work_progress: { create: false, edit: false, update: false, delete: false, view: true },
    inventory: { create: true, edit: true, update: true, delete: false, view: true },
    attendance: { create: false, edit: false, update: false, delete: false, view: false },
    billing: { create: false, edit: false, update: false, delete: false, view: false, approve: false },
  },
  accounts: {
    project_data: { create: false, edit: false, update: false, delete: false, view: true },
    planning: { create: false, edit: false, update: false, delete: false, view: true },
    work_progress: { create: false, edit: false, update: false, delete: false, view: true },
    inventory: { create: true, edit: true, update: true, delete: false, view: true },
    attendance: { create: false, edit: false, update: false, delete: false, view: true },
    billing: { create: false, edit: true, update: true, delete: false, view: true, approve: true },
  },
};

/** Sentinel: when entity has no RBAC mapping, allow all (so UI shows all buttons). */
const ALLOW_ALL_MODULE = '_allow_all';
const allowAllPerms = { create: true, edit: true, update: true, delete: true, view: true, approve: true };
ROLES.forEach((r) => {
  ROLE_PERMISSIONS[r][ALLOW_ALL_MODULE] = allowAllPerms;
});

function normalizeRole(role) {
  if (!role) return 'site_engineer';
  const key = String(role).toLowerCase().trim();
  return ROLE_ALIAS[key] || (ROLES.includes(key) ? key : 'site_engineer');
}

/**
 * Check if role has permission for module + action.
 * Strict: only roles and authority.xlsx matrix (ROLE_PERMISSIONS) — no bypasses.
 * @param {string} role - User's role (e.g. from Redux auth.current.role)
 * @param {string} module - project_data | planning | work_progress | inventory | attendance | billing
 * @param {string} action - create | edit | update | delete | view | approve
 */
export function hasPermission(role, module, action) {
  const r = normalizeRole(role);
  const perms = ROLE_PERMISSIONS[r];
  if (!perms) return false;
  const mod = perms[module];
  if (!mod) return false;
  return mod[action] === true;
}

export { ALLOW_ALL_MODULE };

/**
 * Map API entity name to RBAC module (for DataTable permission checks).
 */
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
  // Path-based entity keys (used by CrudModule config.entity)
  'inventory/requirement': 'inventory',
  'inventory/purchase-order': 'inventory',
  'inventory/transaction': 'inventory',
  'inventory/site-transfer': 'inventory',
  'inventory/supplier': 'inventory',
};

/**
 * Map route path (menu key) to RBAC module for sidebar visibility.
 * Menu item is shown if user has at least 'view' on the module.
 */
export const MENU_MODULE_MAP = {
  dashboard: null, // always show
  customer: 'project_data',
  units: 'project_data',
  'work-module': 'planning',
  'work/planning': 'planning',
  'work/wip': 'work_progress',
  '/work/balance-work': 'work_progress',
  'work/set-rate': 'project_data',
  'attendance-module': 'attendance',
  attendance: 'attendance',
  labour: 'attendance',
  'attendance/manage-company-staff': 'attendance',
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

/** Path prefix or path -> RBAC module for route guard (redirect when no view). */
export const PATH_TO_MODULE = {
  '/customer': 'project_data',
  '/units': 'project_data',
  '/projects': 'project_data',
  '/work/set-rate': 'project_data',
  '/work/planning': 'planning',
  '/work/wip': 'work_progress',
  '/attendance': 'attendance',
  '/labour': 'attendance',
  '/attendance/manage-company-staff': 'attendance',
  '/vendor': 'attendance',
  '/inventory': 'inventory',
  '/billing': 'billing',
  '/invoice': 'billing',
  '/profile': null,
};
