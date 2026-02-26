export const IN_PROGRESS_STAGES = ['draft', 'audit_check', 'final_check'];

export function isInProgress(inv) {
  return inv?.billType === 'normal' && inv?.billingStage && IN_PROGRESS_STAGES.includes(inv.billingStage);
}

export function getStageLabel(billingStage, status) {
  if (!billingStage) return { label: '—', color: 'default' };
  if (billingStage === 'on_hold' || status === 'on hold') return { label: 'On hold', color: 'warning' };
  if (billingStage === 'suspended') return { label: 'Suspended', color: 'default' };
  if (IN_PROGRESS_STAGES.includes(billingStage)) return { label: 'In progress', color: 'processing' };
  if (billingStage === 'approved') return { label: 'Approved', color: 'success' };
  if (billingStage === 'payment') return { label: 'Ledger / Paid', color: 'success' };
  const formatted = billingStage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { label: formatted, color: 'default' };
}
