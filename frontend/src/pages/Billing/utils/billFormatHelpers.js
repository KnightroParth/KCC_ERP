/**
 * Shared helpers for bill display/export in Excel format.
 * Used by BillPreviewExcelFormat, pdfGenerator, billExcelExport.
 */

function toId(v) {
  return v && typeof v === 'object' && v._id != null ? v._id : v;
}

/**
 * Safe getter for invoice adjustments. Use everywhere we read adjustments so All Bills,
 * PDF download, and read views don't crash on old invoices missing securityHoldAmount.
 */
export function getInvoiceAdjustments(invoice) {
  const adj = invoice?.adjustments;
  if (!adj || typeof adj !== 'object') {
    return { advanceDeduction: 0, penalty: 0, holdAmount: 0, securityHoldAmount: 0 };
  }
  return {
    advanceDeduction: Number(adj.advanceDeduction) || 0,
    penalty: Number(adj.penalty) || 0,
    holdAmount: Number(adj.holdAmount) || 0,
    securityHoldAmount: Number(adj.securityHoldAmount) || 0,
  };
}

export function getUnit(description) {
  if (!description || typeof description !== 'string') return '-';
  const m = description.match(/Unit:\s*(.+)/i);
  return m ? m[1].trim() : (description.trim() || '-');
}

/**
 * Category of work only (e.g. "Tile work"). itemName is often "Tile work - Building - UnitNo".
 * Used for clubbing: same line when same category + same unit type + same amount.
 */
export function getWorkCategory(itemName) {
  if (!itemName || typeof itemName !== 'string') return '-';
  const first = itemName.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean)[0];
  return first || '-';
}

export function getBuildNo(itemName) {
  if (!itemName || typeof itemName !== 'string') return '-';
  const parts = itemName.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && /^[A-Za-z0-9]+$/.test(parts[1]) && parts[1].length <= 8) return parts[1];
  return '-';
}

/**
 * From itemName "Work Type - Building - FlatNo" return building and flat for display.
 * e.g. "Slab Piping - A - 101" → { building: "A", flat: "101", display: "A-101" }
 */
export function getBuildingAndFlat(itemName) {
  if (!itemName || typeof itemName !== 'string') return { building: '-', flat: '-', display: '-' };
  const parts = itemName.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);
  const building = parts.length >= 2 ? parts[1] : '-';
  const flat = parts.length >= 3 ? parts[2] : '-';
  const display = building !== '-' && flat !== '-' ? `${building}-${flat}` : building !== '-' ? building : flat !== '-' ? flat : '-';
  return { building, flat, display };
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
 * Club (group) invoice items by same category of work, same unit type (e.g. 1 BHK, 2 BHK), and same amount.
 * So e.g. "Tile work" for multiple units that are all 1 BHK and same rate/amount → one line with No. of Flat = sum.
 * Key: workCategory (e.g. Tile work) + unit type (from description "Unit: 1 BHK") + amount.
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

  // Group by (category of work, unit type, amount) — so same work + same 1 BHK/2 BHK + same amount → one line
  const key = (i) => {
    const workCategory = getWorkCategory(i.itemName);
    const unitType = getUnit(i.description);
    const amt = Math.round(Number(i.total || 0) * 100) / 100;
    return `${workCategory}\n${unitType}\n${amt}`;
  };

  const groups = new Map();
  items.forEach((i, idx) => {
    const k = key(i);
    const bf = getBuildingAndFlat(i.itemName);
    if (!groups.has(k)) {
      const flags = getFlags(idx);
      groups.set(k, {
        workType: getWorkCategory(i.itemName),
        buildNo: getBuildNo(i.itemName),
        unit: getUnit(i.description),
        noOfFlat: Number(i.quantity) ?? 1,
        rate: Number(i.price) ?? 0,
        amount: Number(i.total) ?? 0,
        itemIndices: [idx],
        buildingsAndFlats: [bf.display],
        isAudited: flags.isAudited,
        isFinalized: flags.isFinalized,
        remarks: [flags.remark].filter(Boolean),
      });
    } else {
      const g = groups.get(k);
      g.noOfFlat += Number(i.quantity) ?? 1;
      g.amount += Number(i.total) ?? 0;
      g.itemIndices.push(idx);
      g.buildingsAndFlats.push(bf.display);
      const f = getFlags(idx);
      if (!f.isAudited) g.isAudited = false;
      if (!f.isFinalized) g.isFinalized = false;
      if (f.remark) g.remarks.push(f.remark);
    }
  });

  return Array.from(groups.values()).map((g) => {
    const totalQty = g.noOfFlat;
    const rate = totalQty > 0 ? Math.round((g.amount / totalQty) * 100) / 100 : g.rate;
    const buildingAndFlatsDisplay = (g.buildingsAndFlats || []).filter(Boolean).join(', ');
    const buildNo = buildingAndFlatsDisplay || (g.buildNo !== '-' ? g.buildNo : '-');
    return {
      workType: g.workType,
      buildNo: buildNo || '-',
      buildingAndFlatsDisplay: buildingAndFlatsDisplay || '-',
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
