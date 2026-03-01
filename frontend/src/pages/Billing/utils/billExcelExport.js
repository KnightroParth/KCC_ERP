import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { getClubbedBillRows, TICK, getInvoiceAdjustments } from './billFormatHelpers';

/**
 * Build bill data in exact Excel format: Contractor Wise Billing (Final).
 * Rows clubbed by same Work Type + Unit + Amount. Columns: Work Type | Build No | Unit | No. of Flat | Rate | Amount | Audit Check | Final Check | Remark
 */
export function buildBillSheetData(invoice, projectName = '', contractorNameOverride = '') {
  const items = invoice?.items || [];
  const { advanceDeduction: advance, penalty, holdAmount: hold, securityHoldAmount: securityHold } = getInvoiceAdjustments(invoice);
  const deductions = advance + penalty + hold + securityHold;
  const grossTotal = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const tentativePayable = Math.max(0, grossTotal - deductions);

  const billDate = invoice?.date ? dayjs(invoice.date).format('DD-MM-YYYY') : dayjs().format('DD-MM-YYYY');
  const billNumber = String(invoice?.number ?? '-');
  const contractorName =
    contractorNameOverride ||
    invoice?.sourceContractorId?.name ||
    (typeof invoice?.sourceContractorId === 'object' ? invoice?.sourceContractorId?.name : '-');

  const rows = [];

  // Row 1: Compact header - Contractor Wise Billing (Final) | Invoice | Date | Contractor
  rows.push([`Contractor Wise Billing (Final)  |  Invoice : ${billNumber}  |  Date : ${billDate}  |  Contractor : ${contractorName}`]);
  rows.push([]);
  // Row 3: Column header
  rows.push(['Work Type', 'Build No', 'Unit', 'No. of Flat', 'Rate', 'Amount', 'Audit Check', 'Final Check', 'Remark']);

  // Data rows: clubbed by (workType, unit, amount)
  const clubbed = getClubbedBillRows(invoice);
  clubbed.forEach((row) => {
    rows.push([
      row.workType,
      row.buildNo,
      row.unit,
      row.noOfFlat,
      row.rate,
      row.amount,
      row.isAudited ? TICK : '',
      row.isFinalized ? TICK : '',
      row.remark || '',
    ]);
  });

  // Totals (exact Excel layout)
  rows.push([]);
  rows.push(['Gross Total :', '', '', '', '', grossTotal, '', '', '']);
  rows.push(['Advance :', '', '', '', '', advance, '', '', '']);
  rows.push(['Penalty :', '', '', '', '', penalty, '', '', '']);
  rows.push(['Less Amount :', '', '', '', '', 0, '', '', '']);
  rows.push(['Hold :', '', '', '', '', hold, '', '', '']);
  rows.push(['Security Hold :', '', '', '', '', securityHold, '', '', '']);
  rows.push(['Tentative Payable :', '', '', '', '', tentativePayable, '', '', '']);

  return rows;
}

/**
 * Download bill as Excel file in the same format as Final Billing Format (Excel).xlsx
 */
export function downloadBillExcel(invoice, projectName = '', contractorNameOverride = '', filename = 'KCC-Bill.xlsx') {
  const rows = buildBillSheetData(invoice, projectName, contractorNameOverride);
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths (approx)
  ws['!cols'] = [
    { wch: 45 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bill');
  XLSX.writeFile(wb, filename);
}
