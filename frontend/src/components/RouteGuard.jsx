import { useLocation, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { hasPermission, PATH_TO_MODULE } from '@/config/roles';

/**
 * Resolve current path to RBAC module (longest prefix match).
 */
function getModuleForPath(path) {
  const entries = Object.entries(PATH_TO_MODULE).filter(([, m]) => m != null);
  entries.sort(([a], [b]) => b.length - a.length);
  const found = entries.find(([p]) => path === p || path.startsWith(p + '/'));
  return found ? found[1] : null;
}

export default function RouteGuard({ children }) {
  const location = useLocation();
  const current = useSelector(selectCurrentAdmin);
  const path = location.pathname || '';

  if (!current?.role) return children;

  const module = getModuleForPath(path);
  if (module == null) return children;

  if (!hasPermission(current.role, module, 'view')) {
    return <Navigate to="/not-authorized" replace state={{ from: path }} />;
  }
  return children;
}
