import { createSelector } from 'reselect';

const selectErp = (state) => state.erp;

// Ensure we only return a valid project object (has _id) or null — guards against corrupt state
export const selectCurrentProject = createSelector([selectErp], (erp) => {
  const p = erp.currentProject ?? null;
  return p && typeof p === 'object' && p._id ? p : null;
});

/** True when project field should be locked (non-master with currentProject set). Master always gets dropdown. */
export const selectShouldLockProject = createSelector(
  [selectCurrentProject, (state) => state.auth?.current],
  (project, auth) => {
    if (!project) return false;
    const role = String((auth && auth.role) || '').toLowerCase().trim();
    const isMaster = role === 'master' || role === 'owner';
    return !isMaster;
  }
);
export const selectCurrentItem = createSelector([selectErp], (erp) => erp.current);

export const selectListItems = createSelector([selectErp], (erp) => erp.list);
export const selectItemById = (itemId) =>
  createSelector(selectListItems, (list) => list?.result?.items?.find((item) => item._id === itemId) ?? null);

export const selectCreatedItem = createSelector([selectErp], (erp) => erp.create);

export const selectUpdatedItem = createSelector([selectErp], (erp) => erp.update);

export const selectRecordPaymentItem = createSelector([selectErp], (erp) => erp.recordPayment);

export const selectReadItem = createSelector([selectErp], (erp) => erp.read);

export const selectDeletedItem = createSelector([selectErp], (erp) => erp.delete);

export const selectSearchedItems = createSelector([selectErp], (erp) => erp.search);
export const selectMailItem = createSelector([selectErp], (erp) => erp.mail);
