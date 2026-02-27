/**
 * Shared helpers for bill display/export in Excel format.
 * Used by BillPreviewExcelFormat, pdfGenerator, billExcelExport.
 */

function toId(v) {
  return v && typeof v === 'object' && v._id != null ? v._id : v;
}

export function getUnit(description) {
  if (!description || typeof description !== 'string') return '-';
  const m = description.match(/Unit:\s*(.+)/i);
  return m ? m[1].trim() : (description.trim() || '-');
}

export function getBuildNo(itemName) {
  if (!itemName || typeof itemName !== 'string') return '-';
  const parts = itemName.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && /^[A-Za-z0-9]+$/.test(parts[1]) && parts[1].length <= 8) return parts[1];
  return '-';
}

/**
 * For item at index i, get Audit Check and Final Check flags and remark from invoice checklists.
 * plannedWorkIds[i] matches auditChecklist/finalChecklist by workAssignId.
 * When draft/audit stage is done, isAudited is true; when final check is done, isFinalized is true.
 * remark comes from auditChecklist entry (entered in Audit Check step).
 */
export function getChecklistFlags(invoice, itemIndex) {
  const plannedIds = invoice?.plannedWorkIds || [];
  const auditList = invoice?.auditChecklist || [];
  const finalList = invoice?.finalChecklist || [];
  const workId = plannedIds[itemIndex];
  const workIdStr = workId != null ? String(toId(workId)) : '';

  const auditEntry = auditList.find((a) => String(toId(a.workAssignId) ?? '') === workIdStr);
  const finalEntry = finalList.find((f) => String(toId(f.workAssignId) ?? '') === workIdStr);

  return {
    isAudited: auditEntry?.isAudited ?? false,
    isFinalized: finalEntry?.isFinalized ?? false,
    remark: (auditEntry?.remarks != null && auditEntry.remarks !== '') ? String(auditEntry.remarks) : '',
  };
}

/** Tick character for "done" in Audit Check / Final Check columns */
export const TICK = '✓';

/**
 * Club (group) invoice items by same category of work, category of unit, and amount.
 * Same (workType, unit, amount) → single line with No. of Flat = sum of qty, Amount = sum of amounts.
 * Returns array of { workType, buildNo, unit, noOfFlat, rate, amount, isAudited, isFinalized, remark } for bill display/export.
 */
export function getClubbedBillRows(invoice) {
  const items = invoice?.items || [];
  const plannedIds = invoice?.plannedWorkIds || [];
  const auditList = invoice?.auditChecklist || [];
  const finalList = invoice?.finalChecklist || [];

  const getFlags = (itemIndex) => {
    const workId = plannedIds[itemIndex];
    const workIdStr = workId != null ? String(toId(workId)) : '';
    const auditEntry = auditList.find((a) => String(toId(a.workAssignId) ?? '') === workIdStr);
    const finalEntry = finalList.find((f) => String(toId(f.workAssignId) ?? '') === workIdStr);
    return {
      isAudited: auditEntry?.isAudited ?? false,
      isFinalized: finalEntry?.isFinalized ?? false,
      remark: (auditEntry?.remarks != null && auditEntry.remarks !== '') ? String(auditEntry.remarks) : '',
    };
  };

  // Group by (workType, unit, amount) - use rounded amount for key
  const key = (i, idx) => {
    const wt = i.itemName || '-';
    const u = getUnit(i.description);
    const amt = Math.round(Number(i.total || 0) * 100) / 100;
    return `${wt}\n${u}\n${amt}`;
  };

  const groups = new Map();
  items.forEach((i, idx) => {
    const k = key(i, idx);
    if (!groups.has(k)) {
      const flags = getFlags(idx);
      groups.set(k, {
        workType: i.itemName || '-',
        buildNo: getBuildNo(i.itemName),
        unit: getUnit(i.description),
        noOfFlat: Number(i.quantity) ?? 1,
        rate: Number(i.price) ?? 0,
        amount: Number(i.total) ?? 0,
        itemIndices: [idx],
        isAudited: flags.isAudited,
        isFinalized: flags.isFinalized,
        remarks: [flags.remark].filter(Boolean),
      });
    } else {
      const g = groups.get(k);
      g.noOfFlat += Number(i.quantity) ?? 1;
      g.amount += Number(i.total) ?? 0;
      g.itemIndices.push(idx);
      const f = getFlags(idx);
      if (!f.isAudited) g.isAudited = false;
      if (!f.isFinalized) g.isFinalized = false;
      if (f.remark) g.remarks.push(f.remark);
    }
  });

  return Array.from(groups.values()).map((g) => {
    const totalQty = g.noOfFlat;
    const rate = totalQty > 0 ? Math.round((g.amount / totalQty) * 100) / 100 : g.rate;
    return {
      workType: g.workType,
      buildNo: g.buildNo,
      unit: g.unit,
      noOfFlat: totalQty,
      rate,
      amount: Math.round(g.amount * 100) / 100,
      isAudited: g.isAudited,
      isFinalized: g.isFinalized,
      remark: g.remarks.length ? g.remarks.join('; ') : '',
    };
  });
}
