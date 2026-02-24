import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { hasPermission, hasGranularPermission, canAccessModule, getEffectiveRole, ROLES } from '@/config/roles';

/** Fail closed: undefined/null/guest or missing role => false. No fallback. */
export default function usePermission(module, action) {
  const current = useSelector(selectCurrentAdmin);
  if (current === undefined || current === null) return false;
  const role = getEffectiveRole(current);
  if (role === null || role === 'guest' || !ROLES.includes(role)) return false;
  if (module === undefined || module === null || action === undefined || action === null) return false;
  return hasPermission(role, module, action) === true;
}

/** Fail closed: undefined/null/guest or unknown role => false. Strict module.view only. */
export function useCanAccessModule(module) {
  const current = useSelector(selectCurrentAdmin);
  if (current === undefined || current === null) return false;
  const role = getEffectiveRole(current);
  if (role === null || role === 'guest' || !ROLES.includes(role)) return false;
  if (module === undefined || module === null || typeof module !== 'string') return false;
  return canAccessModule(role, module) === true;
}

/** Fail closed: only exact dotted path. No fallback to module-level. undefined/null/guest => false. */
export function useGranularPermission(module, actionPath) {
  const current = useSelector(selectCurrentAdmin);
  if (current === undefined || current === null) return false;
  const role = getEffectiveRole(current);
  if (role === null || role === 'guest' || !ROLES.includes(role)) return false;
  if (module === undefined || module === null || typeof module !== 'string') return false;
  if (actionPath === undefined || actionPath === null || typeof actionPath !== 'string' || !actionPath.includes('.')) return false;
  return hasGranularPermission(role, module, actionPath) === true;
}
