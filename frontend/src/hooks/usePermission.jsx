import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { hasPermission } from '@/config/roles';

/**
 * Check if the current user has permission for (module, action).
 * @param {string} module - project_data | planning | work_progress | inventory | attendance | billing
 * @param {string} action - create | edit | update | delete | view | approve
 * @returns {boolean}
 */
export default function usePermission(module, action) {
  const current = useSelector(selectCurrentAdmin);
  const role = current?.role;
  return hasPermission(role, module, action);
}
