import React, { useState } from 'react';
import { Card, Row, Col, Button, message } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '@/request/request';

/**
 * Step 4: Approval — Review the finalized invoice and formally update status to Approved.
 */
export default function ApprovalStep({ invoice, onApproved }) {
  const [submitting, setSubmitting] = useState(false);

  const items = invoice?.items || [];
  const adjustments = invoice?.adjustments || {};
  const advance = Number(adjustments.advanceDeduction) || 0;
  const penalty = Number(adjustments.penalty) || 0;
  const hold = Number(adjustments.holdAmount) || 0;
  const deductions = advance + penalty + hold;
  const grossTotal = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const netPayable = Math.max(0, grossTotal - deductions);

  const billDate = invoice?.date ? dayjs(invoice.date) : dayjs();
  const billNumber = invoice?.number ?? '-';
  const year = invoice?.year ?? new Date().getFullYear();
  const contractorName =
    invoice?.sourceContractorId?.name ??
    (typeof invoice?.sourceContractorId === 'object' ? invoice?.sourceContractorId?.name : '-');

  const handleApprove = async () => {
    if (!invoice?._id) return;
    setSubmitting(true);
    try {
      const toId = (v) => (v && typeof v === 'object' && v._id ? v._id : v);
      const payload = {
        ...invoice,
        billingStage: 'approved',
        status: 'approved',
        sourceContractorId: toId(invoice?.sourceContractorId),
        sourceProjectId: toId(invoice?.sourceProjectId),
      };
      const res = await request.update({
        entity: 'invoice',
        id: invoice._id,
        jsonData: payload,
      });
      if (res?.success) {
        message.success('Bill approved.');
        onApproved?.(res.result);
      } else {
        message.error(res?.message || 'Failed to approve');
      }
    } catch (e) {
      message.error('Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Approval" size="small" style={{ color: '#333' }} className="billing-approval-step-card">
      <p style={{ marginBottom: 16, color: '#666' }}>
        Review the finalized bill below. Click <strong>Approve</strong> to formally set the bill status to Approved so it can be paid and posted to the ledger.
      </p>
      <Card size="small" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 8]}>
          <Col span={12}>Contractor</Col>
          <Col span={12} style={{ textAlign: 'right' }}><strong>{contractorName}</strong></Col>
          <Col span={12}>Bill Number</Col>
          <Col span={12} style={{ textAlign: 'right' }}><strong>{billNumber}/{year}</strong></Col>
          <Col span={12}>Bill Date</Col>
          <Col span={12} style={{ textAlign: 'right' }}>{billDate.format('DD/MM/YYYY')}</Col>
          <Col span={12}>Gross Total (₹)</Col>
          <Col span={12} style={{ textAlign: 'right' }}>{grossTotal.toFixed(2)}</Col>
          <Col span={12}>Deductions (₹)</Col>
          <Col span={12} style={{ textAlign: 'right' }}>{deductions.toFixed(2)}</Col>
          <Col span={12}><strong>Net Payable (₹)</strong></Col>
          <Col span={12} style={{ textAlign: 'right' }}><strong>₹{netPayable.toFixed(2)}</strong></Col>
        </Row>
      </Card>
      <div>
        <Button
          type="primary"
          size="large"
          icon={<CheckOutlined />}
          onClick={handleApprove}
          loading={submitting}
        >
          Approve
        </Button>
      </div>
    </Card>
  );
}
