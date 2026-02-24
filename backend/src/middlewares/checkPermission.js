const { hasPermission, hasGranularPermission, getEffectiveRole } = require('@/config/roles');

/**
 * RBAC middleware: require permission (module, action). Uses role ?? designation (fail closed).
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
    const role = getEffectiveRole(user);
    if (role == null) {
      return res.status(403).json({
        success: false,
        result: null,
        message: 'You do not have permission to perform this action.',
        code: 'FORBIDDEN',
      });
    }
    if (hasPermission(role, module, action)) return next();
    return res.status(403).json({
      success: false,
      result: null,
      message: 'You do not have permission to perform this action.',
      code: 'FORBIDDEN',
    });
  };
}

/**
 * Require at least one granular permission. Uses role ?? designation (fail closed).
 */
function checkGranularPermission(module, ...actionPaths) {
  return (req, res, next) => {
    const user = req.admin;
    if (!user) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'Authentication required.',
      });
    }
    const role = getEffectiveRole(user);
    if (role == null) {
      return res.status(403).json({
        success: false,
        result: null,
        message: 'You do not have permission to perform this action.',
        code: 'FORBIDDEN',
      });
    }
    const allowed = actionPaths.some((path) => hasGranularPermission(role, module, path));
    if (allowed) return next();
    return res.status(403).json({
      success: false,
      result: null,
      message: 'You do not have permission to perform this action.',
      code: 'FORBIDDEN',
    });
  };
}

module.exports = checkPermission;
module.exports.checkGranularPermission = checkGranularPermission;
