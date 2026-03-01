import React, { useState } from 'react';
import { Table, Card, Row, Col, Button, message } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import logoUrl from '@/style/images/logo-text.png';
import { downloadBillPDF } from '../utils/pdfGenerator';
import { downloadBillExcel } from '../utils/billExcelExport';
import { getClubbedBillRows, getInvoiceAdjustments } from '../utils/billFormatHelpers';

/**
 * Bill preview in exact Excel format: KCC logo at top, Contractor Wise Billing (Final),
 * Invoice No, Date, Contractor Name, table with Work Type | Build No | Unit | No. of Flat | Rate | Amount | Audit Check | Final Check | Remark.
 * When draft/audit stages are done, Audit Check shows tick; when final check is done, Final Check shows tick.
 * Includes Download PDF and Download Excel buttons.
 */
export default function BillPreviewExcelFormat({
  invoice,
  projectName = '',
  contractorName: contractorNameProp,
  onDownloadPdf,
  onDownloadExcel,
  showDownloadButtons = true,
}) {
  const items = invoice?.items || [];
  const { advanceDeduction: advance, penalty, holdAmount: hold, securityHoldAmount: securityHold } = getInvoiceAdjustments(invoice);
  const deductions = advance + penalty + hold + securityHold;
  const grossTotal = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const tentativePayable = Math.max(0, grossTotal - deductions);

  const billDate = invoice?.date ? dayjs(invoice.date).format('DD-MM-YYYY') : dayjs().format('DD-MM-YYYY');
  const billNumber = invoice?.number ?? '-';
  const contractorName =
    contractorNameProp ??
    invoice?.sourceContractorId?.name ??
    (typeof invoice?.sourceContractorId === 'object' ? invoice?.sourceContractorId?.name : '-');

  const clubbedRows = getClubbedBillRows(invoice);
  const dataSource = clubbedRows.map((row, idx) => ({
    key: `clubbed-${idx}-${row.workType}-${row.unit}-${row.amount}`,
    workType: row.workType,
    buildNo: row.buildNo || row.buildingAndFlatsDisplay || '-',
    unit: row.unit,
    noOfFlat: row.noOfFlat,
    rate: row.rate,
    amount: row.amount,
    auditCheck: row.isAudited,
    finalCheck: row.isFinalized,
    remark: row.remark || '',
  }));

  const columns = [
    { title: 'Work Type', dataIndex: 'workType', key: 'workType', ellipsis: true, width: 220 },
    { title: 'Build No / Flats', dataIndex: 'buildNo', key: 'buildNo', width: 160, ellipsis: true },
    { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 72 },
    { title: 'No. of Flat', dataIndex: 'noOfFlat', key: 'noOfFlat', width: 88, align: 'right' },
    { title: 'Rate', dataIndex: 'rate', key: 'rate', width: 80, align: 'right', render: (v) => Number(v || 0).toFixed(2) },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 88, align: 'right', render: (v) => Number(v || 0).toFixed(2) },
    {
      title: 'Audit Check',
      dataIndex: 'auditCheck',
      key: 'auditCheck',
      width: 88,
      align: 'center',
      render: (v) => (v ? <CheckOutlined style={{ color: '#166534', fontSize: 18, backgroundColor: 'transparent' }} /> : ''),
    },
    {
      title: 'Final Check',
      dataIndex: 'finalCheck',
      key: 'finalCheck',
      width: 88,
      align: 'center',
      render: (v) => (v ? <CheckOutlined style={{ color: '#166534', fontSize: 18, backgroundColor: 'transparent' }} /> : ''),
    },
    { title: 'Remark', dataIndex: 'remark', key: 'remark', width: 120, ellipsis: true },
  ];

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }
    setDownloadingPdf(true);
    let logoBase64 = '';
    let logoSize = null;
    try {
      const res = await fetch(logoUrl);
      const blob = await res.blob();
      logoBase64 = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      logoSize = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = logoBase64;
      });
    } catch (_) {}
    try {
      downloadBillPDF(
        invoice,
        projectName,
        `KCC-Bill-${invoice?.number ?? 'draft'}.pdf`,
        contractorName,
        logoBase64,
        logoSize,
      );
    } catch (e) {
      message.error(e?.message || 'Failed to generate PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = () => {
    if (onDownloadExcel) {
      onDownloadExcel();
      return;
    }
    downloadBillExcel(invoice, projectName, contractorName, `KCC-Bill-${invoice?.number ?? 'draft'}.xlsx`);
  };

  return (
    <Card size="small" style={{ marginBottom: 24 }} className="bill-preview-excel-format">
      {/* Compact header: logo + Contractor Wise Billing, Invoice, Date, Contractor inline */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <img src={logoUrl} alt="KCC" style={{ maxHeight: 44, objectFit: 'contain' }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 20px', fontSize: 13 }}>
          <span style={{ fontWeight: 700 }}>Contractor Wise Billing (Final)</span>
          <span>Invoice : {billNumber}</span>
          <span>Date : {billDate}</span>
          <span>Contractor : {contractorName}</span>
        </div>
      </div>

      {/* Table: exact Excel columns including Audit Check & Final Check ticks */}
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 900 }}
        style={{ marginBottom: 16 }}
        className="bill-preview-excel-table"
      />

      {/* Totals: exact Excel layout */}
      <div className="bill-preview-totals" style={{ marginBottom: 16, border: '1px solid #d9d9d9', borderTop: 'none', padding: '12px 16px', background: '#fafafa' }}>
        <Row gutter={[0, 6]}>
          <Col span={12} style={{ padding: '2px 0' }}>Gross Total :</Col>
          <Col span={12} style={{ textAlign: 'right', padding: '2px 0' }}>{grossTotal.toFixed(2)}</Col>
          <Col span={12} style={{ padding: '2px 0' }}>Advance :</Col>
          <Col span={12} style={{ textAlign: 'right', padding: '2px 0' }}>{advance.toFixed(2)}</Col>
          <Col span={12} style={{ padding: '2px 0' }}>Penalty :</Col>
          <Col span={12} style={{ textAlign: 'right', padding: '2px 0' }}>{penalty.toFixed(2)}</Col>
          <Col span={12} style={{ padding: '2px 0' }}>Less Amount :</Col>
          <Col span={12} style={{ textAlign: 'right', padding: '2px 0' }}>0.00</Col>
          <Col span={12} style={{ padding: '2px 0' }}>Hold :</Col>
          <Col span={12} style={{ textAlign: 'right', padding: '2px 0' }}>{hold.toFixed(2)}</Col>
          <Col span={12} style={{ padding: '2px 0' }}>Security Hold :</Col>
          <Col span={12} style={{ textAlign: 'right', padding: '2px 0' }}>{securityHold.toFixed(2)}</Col>
          <Col span={12} style={{ fontWeight: 600, padding: '4px 0 2px' }}>Tentative Payable :</Col>
          <Col span={12} style={{ textAlign: 'right', fontWeight: 600, padding: '4px 0 2px' }}>{tentativePayable.toFixed(2)}</Col>
        </Row>
      </div>

      {showDownloadButtons && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={handleDownloadPdf} loading={downloadingPdf}>
            Download PDF
          </Button>
          <Button icon={<FileExcelOutlined />} onClick={handleDownloadExcel}>
            Download Excel
          </Button>
        </div>
      )}
    </Card>
  );
}
