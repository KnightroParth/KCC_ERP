import React, { useMemo } from 'react';
import { Card, Table, Button, Row, Col, Typography } from 'antd';
import { PrinterOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { downloadBillPDF } from '../utils/pdfGenerator';

/**
 * Print Bill: Header (KCC, Project, Bill No, Date), Body (grouped by Work Type), Footer (Gross, Deductions, Net, Signatures).
 */
export default function PrintBill({ invoice, projectName }) {
  const items = invoice?.items || [];
  const adjustments = invoice?.adjustments || {};
  const advance = Number(adjustments.advanceDeduction) || 0;
  const penalty = Number(adjustments.penalty) || 0;
  const hold = Number(adjustments.holdAmount) || 0;
  const deductions = advance + penalty + hold;
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    downloadBillPDF(invoice, projectName, `KCC-Bill-${invoice?.number ?? 'draft'}.pdf`);
  };

  return (
    <Card
      title="Print Bill"
      size="small"
      extra={
        <>
          <Button icon={<PrinterOutlined />} onClick={handlePrint} style={{ marginRight: 8 }}>
            Print
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
            Download PDF
          </Button>
        </>
      }
      className="print-bill-card"
    >
      {/* Header */}
      <div className="no-print" style={{ marginBottom: 24 }}>
        <Typography.Title level={5} style={{ marginBottom: 4 }}>KOTHARI CONSTRUCTION COMPANY</Typography.Title>
        <Row gutter={[16, 4]}>
          <Col span={12}>Project: <strong>{projectName || '-'}</strong></Col>
          <Col span={12}>Bill No: <strong>{invoice?.number ?? '-'}/{invoice?.year ?? '-'}</strong></Col>
          <Col span={12}>Date: <strong>{invoice?.date ? dayjs(invoice.date).format('DD/MM/YYYY') : '-'}</strong></Col>
          <Col span={12}>Contractor: <strong>{invoice?.client?.name || '-'}</strong></Col>
        </Row>
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
