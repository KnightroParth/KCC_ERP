import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

/**
 * Generate RA Bill PDF.
 * @param {Object} invoice - Invoice with items, adjustments, client, etc.
 * @param {string} projectName - Project name for header
 * @param {string} [contractorNameOverride] - Optional contractor name (e.g. when invoice ref not populated)
 */
export function generateBillPDF(invoice, projectName = '', contractorNameOverride = '') {
  const doc = new jsPDF();
  const items = invoice?.items || [];
  const adjustments = invoice?.adjustments || {};
  const advance = Number(adjustments.advanceDeduction) || 0;
  const penalty = Number(adjustments.penalty) || 0;
  const hold = Number(adjustments.holdAmount) || 0;
  const deductions = advance + penalty + hold;
  const grossTotal = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const netPayable = Math.max(0, grossTotal - deductions);

  const contractorName = contractorNameOverride || invoice?.sourceContractorId?.name || invoice?.client?.name || 'Contractor';
  const billNo = invoice?.number ?? '-';
  const year = invoice?.year ?? new Date().getFullYear();
  const billDate = invoice?.date ? dayjs(invoice.date).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');

  // ----- Header -----
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('KOTHARI CONSTRUCTION COMPANY', 14, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${projectName || '-'}`, 14, 22);
  doc.text(`Bill No: ${billNo}/${year}`, 14, 28);
  doc.text(`Date: ${billDate}`, 14, 34);
  doc.text(`Contractor: ${contractorName}`, 14, 40);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(14, 44, 196, 44);

  // ----- Body: group items by work type (from itemName prefix or description) -----
  const byWorkType = {};
  items.forEach((item) => {
    const name = item.itemName || '';
    const workType = name.split(' - ')[0] || 'Other';
    if (!byWorkType[workType]) byWorkType[workType] = [];
    byWorkType[workType].push(item);
  });

  let yPos = 52;
  const tableHead = [['Item', 'Description', 'Qty', 'Rate (₹)', 'Amount (₹)']];

  Object.entries(byWorkType).forEach(([workType, rows]) => {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 119, 255);
    doc.text(workType, 14, yPos);
    yPos += 6;

    const tableBody = rows.map((r) => [
      r.itemName || '',
      r.description || '-',
      r.quantity ?? 1,
      Number(r.price || 0).toFixed(2),
      Number(r.total || 0).toFixed(2),
    ]);
    autoTable(doc, {
      startY: yPos,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [22, 119, 255] },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    });
    yPos = doc.lastAutoTable.finalY + 8;
  });

  // ----- Footer: Totals -----
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('Gross Total (₹):', 14, yPos);
  doc.text(grossTotal.toFixed(2), 196, yPos, { align: 'right' });
  yPos += 7;
  doc.text('Advance Deduction (₹):', 14, yPos);
  doc.text(advance.toFixed(2), 196, yPos, { align: 'right' });
  yPos += 7;
  doc.text('Penalty (₹):', 14, yPos);
  doc.text(penalty.toFixed(2), 196, yPos, { align: 'right' });
  yPos += 7;
  doc.text('Hold (₹):', 14, yPos);
  doc.text(hold.toFixed(2), 196, yPos, { align: 'right' });
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Net Payable (₹):', 14, yPos);
  doc.text(netPayable.toFixed(2), 196, yPos, { align: 'right' });
  yPos += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Contractor Signature', 14, yPos + 20);
  doc.text('Site Engineer', 80, yPos + 20);
  doc.text('Project Manager', 140, yPos + 20);

  return doc;
}

export function downloadBillPDF(invoice, projectName, filename, contractorNameOverride = '') {
  const doc = generateBillPDF(invoice, projectName, contractorNameOverride);
  doc.save(filename || `KCC-Bill-${invoice?.number ?? 'draft'}.pdf`);
}
