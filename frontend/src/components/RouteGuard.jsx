import { useLocation, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { getEffectiveRole, getPermissionsForRole, PATH_TO_MODULE } from '@/config/roles';

function getModuleForPath(path) {
  const normalized = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  const entries = Object.entries(PATH_TO_MODULE).filter(([, m]) => m != null);
  entries.sort(([a], [b]) => b.length - a.length);
  const found = entries.find(([p]) => normalized === p || normalized.startsWith(p + '/'));
  return found ? found[1] : null;
}

/**
 * Fail closed: only render children if path is unprotected OR role has module.view === true.
 * Unmapped path => allow (no module). Mapped path + no role or module.view !== true => redirect.
 */
export default function RouteGuard({ children }) {
  const location = useLocation();
  const current = useSelector(selectCurrentAdmin);
  const path = location.pathname || '';

  const module = getModuleForPath(path);
  if (module == null) return children;

  const role = getEffectiveRole(current);
  if (role == null) return <Navigate to="/not-authorized" replace state={{ from: path }} />;
  const perms = getPermissionsForRole(role);
  const mod = perms[module];
  if (mod == null || mod.view !== true) {
    return <Navigate to="/not-authorized" replace state={{ from: path }} />;
  }
  return children;
}
