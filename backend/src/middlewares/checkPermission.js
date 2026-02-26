const { hasPermission } = require('@/config/roles');

/**
 * RBAC middleware: require permission (module, action) for the current user.
 * Must be used after isValidAuthToken so req.admin (or req[userModel]) is set.
 * Permissions are strictly from roles and authority.xlsx (ROLE_PERMISSIONS).
 *
 * @param {string} module - One of: project_data, planning, work_progress, inventory, attendance, billing
 * @param {string} action - One of: create, edit, update, delete, view, approve
 * @param {string} [userKey='admin'] - Request key for user (e.g. 'admin' => req.admin)
 */
function checkPermission(module, action, userKey = 'admin') {
  return (req, res, next) => {
    const user = req[userKey];
    if (!user) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'Authentication required.',
      });
    }
    const role = user.role;
    if (hasPermission(role, module, action)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      result: null,
      message: 'You do not have permission to perform this action.',
      code: 'FORBIDDEN',
    });
  };
}

module.exports = checkPermission;
