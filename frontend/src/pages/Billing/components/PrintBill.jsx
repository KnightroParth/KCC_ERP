import React, { useMemo, useState, useEffect } from 'react';
import { Card, Table, Button, Row, Col, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import request from '@/request/request';
import dayjs from 'dayjs';
import { downloadBillPDF } from '../utils/pdfGenerator';
import { getInvoiceAdjustments } from '../utils/billFormatHelpers';
import logoUrl from '@/style/images/logo-text.png';

/**
 * Print Bill: Header (KCC, Project, Bill No, Date), Body (grouped by Work Type), Footer (Gross, Deductions, Net, Signatures).
 */
export default function PrintBill({ invoice, projectName, contractorName: contractorNameProp }) {
  const [fetchedContractorName, setFetchedContractorName] = useState('');
  const contractorId = invoice?.sourceContractorId?._id ?? (typeof invoice?.sourceContractorId === 'string' ? invoice.sourceContractorId : null);
  const displayContractorName =
    contractorNameProp || invoice?.sourceContractorId?.name || fetchedContractorName || '-';

  useEffect(() => {
    if (displayContractorName !== '-' || !contractorId) return;
    request.read({ entity: 'vendor', id: contractorId }).then((res) => {
      if (res?.result?.name) setFetchedContractorName(res.result.name);
    }).catch(() => {});
  }, [contractorId, displayContractorName]);

  const items = invoice?.items || [];
  const { advanceDeduction: advance, penalty, holdAmount: hold, securityHoldAmount: securityHold } = getInvoiceAdjustments(invoice);
  const deductions = advance + penalty + hold + securityHold;
  const grossTotal = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const netPayable = Math.max(0, grossTotal - deductions);

  const byWorkType = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const name = item.itemName || '';
      const workType = name.split(' - ')[0] || 'Other';
      if (!map[workType]) map[workType] = [];
      map[workType].push(item);
    });
    return map;
  }, [items]);

  const columns = [
    { title: 'Item', dataIndex: 'itemName', key: 'itemName' },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v) => v || '-' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' },
    { title: 'Rate (₹)', dataIndex: 'price', key: 'price', width: 100, align: 'right', render: (v) => Number(v || 0).toFixed(2) },
    { title: 'Amount (₹)', dataIndex: 'total', key: 'total', width: 120, align: 'right', render: (v) => Number(v || 0).toFixed(2) },
  ];

  const handleDownload = async () => {
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
    downloadBillPDF(
      invoice,
      projectName,
      `KCC-Bill-${invoice?.number ?? 'draft'}.pdf`,
      displayContractorName,
      logoBase64,
      logoSize,
    );
  };

  return (
    <Card
      title="Download PDF"
      size="small"
      extra={
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
          Download PDF
        </Button>
      }
      className="print-bill-card"
    >
      {/* Compact header: logo + Contractor Wise Billing, Invoice, Date, Contractor inline */}
      <div className="no-print" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <img src={logoUrl} alt="KCC" style={{ maxHeight: 44, objectFit: 'contain' }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px 24px', fontSize: 13 }}>
          <span><strong>Contractor Wise Billing (Final)</strong></span>
          <span>Invoice: <strong>{invoice?.number ?? '-'}/{invoice?.year ?? '-'}</strong></span>
          <span>Date: <strong>{invoice?.date ? dayjs(invoice.date).format('DD/MM/YYYY') : '-'}</strong></span>
          <span>Contractor: <strong>{displayContractorName}</strong></span>
          <span>Project: <strong>{projectName || '-'}</strong></span>
        </div>
      </div>

      {/* Body grouped by work type */}
      {Object.entries(byWorkType).map(([workType, rows]) => (
        <div key={workType} style={{ marginBottom: 24 }}>
          <Typography.Text strong style={{ color: '#1677ff' }}>{workType}</Typography.Text>
          <Table
            rowKey={(r, i) => r._id || i}
            columns={columns}
            dataSource={rows}
            pagination={false}
            size="small"
            style={{ marginTop: 8 }}
          />
        </div>
      ))}

      {/* Footer */}
      <Card size="small" style={{ marginTop: 24 }}>
        <Row gutter={[16, 8]}>
          <Col span={12}>Gross Total (₹)</Col>
          <Col span={12} style={{ textAlign: 'right' }}>{grossTotal.toFixed(2)}</Col>
          <Col span={12}>Advance Deduction (₹)</Col>
          <Col span={12} style={{ textAlign: 'right' }}>{advance.toFixed(2)}</Col>
          <Col span={12}>Penalty (₹)</Col>
          <Col span={12} style={{ textAlign: 'right' }}>{penalty.toFixed(2)}</Col>
          <Col span={12}>Hold (₹)</Col>
          <Col span={12} style={{ textAlign: 'right' }}>{hold.toFixed(2)}</Col>
          <Col span={12}>Security Hold (₹)</Col>
          <Col span={12} style={{ textAlign: 'right' }}>{securityHold.toFixed(2)}</Col>
          <Col span={12}><strong>Net Payable (₹)</strong></Col>
          <Col span={12} style={{ textAlign: 'right' }}><strong>{netPayable.toFixed(2)}</strong></Col>
        </Row>
        <Row style={{ marginTop: 32, fontSize: 12, color: '#666' }}>
          <Col span={8}>Contractor Signature</Col>
          <Col span={8}>Site Engineer</Col>
          <Col span={8}>Project Manager</Col>
        </Row>
      </Card>
    </Card>
  );
}
