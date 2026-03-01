import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { getClubbedBillRows, getInvoiceAdjustments } from './billFormatHelpers';

const LOGO_MAX_MM = { w: 36, h: 18 };

function logoDisplaySize(imgW, imgH) {
  if (!imgW || !imgH) return { w: LOGO_MAX_MM.w, h: LOGO_MAX_MM.h };
  const aspect = imgW / imgH;
  const hByWidth = LOGO_MAX_MM.w / aspect;
  if (hByWidth <= LOGO_MAX_MM.h) {
    return { w: LOGO_MAX_MM.w, h: hByWidth };
  }
  return { w: LOGO_MAX_MM.h * aspect, h: LOGO_MAX_MM.h };
}

/**
 * Generate Bill PDF in Excel format: KCC logo only at top, then Contractor Wise Billing (Final),
 * Invoice No, Date, Contractor Name, table (Work Type | Build No | Unit | No. of Flat | Rate | Amount),
 * then Gross Total, Advance, Penalty, Less Amount, Hold, Tentative Payable.
 */
export function generateBillPDF(invoice, projectName = '', contractorNameOverride = '', logoBase64 = '', logoSize = null) {
  const doc = new jsPDF();
  const items = invoice?.items || [];
  const { advanceDeduction: advance, penalty, holdAmount: hold, securityHoldAmount: securityHold } = getInvoiceAdjustments(invoice);
  const deductions = advance + penalty + hold + securityHold;
  const grossTotal = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const tentativePayable = Math.max(0, grossTotal - deductions);

  const contractorName = contractorNameOverride || invoice?.sourceContractorId?.name || 'Contractor';
  const billNo = invoice?.number ?? '-';
  const year = invoice?.year ?? new Date().getFullYear();
  const billDate = invoice?.date ? dayjs(invoice.date).format('DD-MM-YYYY') : dayjs().format('DD-MM-YYYY');

  const left = 14;
  const pageW = doc.internal.pageSize.getWidth();
  let yPos = 10;

  // ----- Compact header: logo left, title + Invoice + Date + Contractor on same row(s) -----
  let logoH = 6;
  if (logoBase64) {
    try {
      const size = logoSize ? logoDisplaySize(logoSize.w, logoSize.h) : { w: LOGO_MAX_MM.w, h: LOGO_MAX_MM.h };
      doc.addImage(logoBase64, 'PNG', left, yPos, size.w, size.h);
      logoH = size.h;
    } catch (_) {}
  }
  const headerY = yPos + logoH / 2 - 2;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Contractor Wise Billing (Final)', left + (logoBase64 ? 42 : 0), headerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Invoice : ${billNo}  |  Date : ${billDate}  |  Contractor : ${contractorName}`, left + (logoBase64 ? 42 : 0), headerY + 5);
  yPos += (logoBase64 ? logoH : 6) + 6;

  // ----- Table: clubbed by (workType, unit, amount) - one line per group -----
  const tableHead = [['Work Type', 'Build No', 'Unit', 'No. of Flat', 'Rate', 'Amount', 'Audit Check', 'Final Check', 'Remark']];
  const clubbed = getClubbedBillRows(invoice);
  const tableBody = clubbed.map((row) => [
    (row.workType || '-').substring(0, 42),
    (row.buildNo || row.buildingAndFlatsDisplay || '-').substring(0, 36),
    row.unit,
    String(row.noOfFlat),
    Number(row.rate || 0).toFixed(2),
    Number(row.amount || 0).toFixed(2),
    '', // drawn in didDrawCell
    '',
    (row.remark || '').substring(0, 20),
  ]);

  const kccNavy = [10, 21, 40];
  const tickGreen = [22, 101, 52];

  autoTable(doc, {
    startY: yPos,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: kccNavy, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7, textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 36 },
      2: { cellWidth: 16 },
      3: { cellWidth: 16, halign: 'right' },
      4: { cellWidth: 14, halign: 'right' },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 14, halign: 'center' },
      8: { cellWidth: 18 },
    },
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const colIdx = data.column && typeof data.column.index === 'number' ? data.column.index : -1;
      const rowIdx = data.row && typeof data.row.index === 'number' ? data.row.index : -1;
      if (rowIdx < 0 || rowIdx >= clubbed.length || (colIdx !== 6 && colIdx !== 7)) return;
      const rowData = clubbed[rowIdx];
      const showTick = (colIdx === 6 && rowData.isAudited) || (colIdx === 7 && rowData.isFinalized);
      if (!showTick) return;

      const cell = data.cell;
      const cx = cell.x + cell.width / 2;
      const cy = cell.y + cell.height / 2 + 1;
      doc.setDrawColor(...tickGreen);
      doc.setLineWidth(0.5);
      const s = 2.2;
      doc.line(cx - s, cy, cx - s * 0.35, cy + s * 0.75);
      doc.line(cx - s * 0.35, cy + s * 0.75, cx + s, cy - s * 1.1);
      doc.setDrawColor(0, 0, 0);
    },
  });
  yPos = doc.lastAutoTable.finalY + 12;

  // ----- Totals (Excel labels) -----
  if (yPos > 235) {
    doc.addPage();
    yPos = 20;
  }
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(left, yPos - 4, pageW - left, yPos - 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Gross Total :', left, yPos);
  doc.text(grossTotal.toFixed(2), 196, yPos, { align: 'right' });
  yPos += 7;
  doc.text('Advance :', left, yPos);
  doc.text(advance.toFixed(2), 196, yPos, { align: 'right' });
  yPos += 7;
  doc.text('Penalty :', left, yPos);
  doc.text(penalty.toFixed(2), 196, yPos, { align: 'right' });
  yPos += 7;
  doc.text('Less Amount :', left, yPos);
  doc.text('0.00', 196, yPos, { align: 'right' });
  yPos += 7;
  doc.text('Hold :', left, yPos);
  doc.text(hold.toFixed(2), 196, yPos, { align: 'right' });
  yPos += 7;
  doc.text('Security Hold :', left, yPos);
  doc.text(securityHold.toFixed(2), 196, yPos, { align: 'right' });
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Tentative Payable :', left, yPos);
  doc.text(tentativePayable.toFixed(2), 196, yPos, { align: 'right' });
  yPos += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Contractor Signature', 14, yPos + 20);
  doc.text('Site Engineer', 80, yPos + 20);
  doc.text('Project Manager', 140, yPos + 20);

  return doc;
}

export function downloadBillPDF(invoice, projectName, filename, contractorNameOverride = '', logoBase64 = '', logoSize = null) {
  const doc = generateBillPDF(invoice, projectName, contractorNameOverride, logoBase64, logoSize);
  const name = filename || `KCC-Bill-${invoice?.number ?? 'draft'}.pdf`;
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    doc.save(name);
  }
}
