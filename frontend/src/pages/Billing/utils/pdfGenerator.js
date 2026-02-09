import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

const KCC_COMPANY = {
  name: 'Kothari Construction Company',
  addressLines: [
    'KCC-A-103, Rami Heritage, Opp. –Old Rto Office, Murtizapur Road, Akola -444001',
    'Maharashtra, India',
  ],
  phone: '+919764999715',
};

const LOGO_MAX_MM = { w: 36, h: 18 };

/**
 * Compute logo display size (mm) to fit inside max box while preserving aspect ratio.
 * @param {number} imgW - image width (px)
 * @param {number} imgH - image height (px)
 * @returns {{ w: number, h: number }}
 */
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
 * Generate RA Bill PDF.
 * @param {Object} invoice - Invoice with items, adjustments, client, etc.
 * @param {string} projectName - Project name for header
 * @param {string} [contractorNameOverride] - Optional contractor name
 * @param {string} [logoBase64] - Optional data URL (data:image/png;base64,...) for logo
 * @param {{ w: number, h: number }} [logoSize] - Optional logo natural size (px) to preserve aspect ratio
 */
export function generateBillPDF(invoice, projectName = '', contractorNameOverride = '', logoBase64 = '', logoSize = null) {
  const doc = new jsPDF();
  const items = invoice?.items || [];
  const adjustments = invoice?.adjustments || {};
  const advance = Number(adjustments.advanceDeduction) || 0;
  const penalty = Number(adjustments.penalty) || 0;
  const hold = Number(adjustments.holdAmount) || 0;
  const deductions = advance + penalty + hold;
  const grossTotal = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const netPayable = Math.max(0, grossTotal - deductions);

  const contractorName = contractorNameOverride || invoice?.sourceContractorId?.name || 'Contractor';
  const billNo = invoice?.number ?? '-';
  const year = invoice?.year ?? new Date().getFullYear();
  const billDate = invoice?.date ? dayjs(invoice.date).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');

  // ----- Header: logo (optional) + company details -----
  let headerBottom = 44;
  const left = 14;
  const pageW = doc.internal.pageSize.getWidth();

  if (logoBase64) {
    try {
      const size = logoSize ? logoDisplaySize(logoSize.w, logoSize.h) : { w: LOGO_MAX_MM.w, h: LOGO_MAX_MM.h };
      doc.addImage(logoBase64, 'PNG', left, 10, size.w, size.h);
    } catch (_) {}
  }

  // Company block (right-aligned or below logo): Company Name + details
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Company Name', pageW - 14, 14, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(KCC_COMPANY.name.toUpperCase(), pageW - 14, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lineHeight = 5;
  KCC_COMPANY.addressLines.forEach((line, i) => {
    doc.text(line, pageW - 14, 26 + i * lineHeight, { align: 'right' });
  });
  const companyBlockBottom = 26 + KCC_COMPANY.addressLines.length * lineHeight + 6;
  doc.text(KCC_COMPANY.phone, pageW - 14, companyBlockBottom, { align: 'right' });
  headerBottom = Math.max(44, companyBlockBottom + 14);

  // Bill info row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Project: ${projectName || '-'}`, left, headerBottom - 18);
  doc.text(`Bill No: ${billNo}/${year}`, left, headerBottom - 12);
  doc.text(`Date: ${billDate}`, left, headerBottom - 6);
  doc.text(`Contractor: ${contractorName}`, left, headerBottom);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(left, headerBottom + 4, pageW - 14, headerBottom + 4);
  headerBottom += 10;

  // ----- Body: group items by work type -----
  const byWorkType = {};
  items.forEach((item) => {
    const name = item.itemName || '';
    const workType = name.split(' - ')[0] || 'Other';
    if (!byWorkType[workType]) byWorkType[workType] = [];
    byWorkType[workType].push(item);
  });

  let yPos = headerBottom + 8;
  const tableHead = [['Item', 'Description', 'Qty', 'Rate (₹)', 'Amount (₹)']];
  const kccNavy = [10, 21, 40];

  Object.entries(byWorkType).forEach(([workType, rows]) => {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...kccNavy);
    doc.text(workType, left, yPos);
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
      headStyles: { fillColor: kccNavy, textColor: [255, 255, 255] },
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

export function downloadBillPDF(invoice, projectName, filename, contractorNameOverride = '', logoBase64 = '', logoSize = null) {
  const doc = generateBillPDF(invoice, projectName, contractorNameOverride, logoBase64, logoSize);
  doc.save(filename || `KCC-Bill-${invoice?.number ?? 'draft'}.pdf`);
}
