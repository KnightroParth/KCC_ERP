import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  InputNumber,
  Row,
  Col,
  message,
  Space,
  Select,
} from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '@/request/request';
import ImageUpload from '@/components/ImageUpload';
import { HOLD_REASONS } from '@/config/workConfig';

/**
 * Final Check: Shows audited items, adjustments panel (advance, penalty, hold),
 * hold reason + photos when hold amount > 0, Bill Number/Date, "Finalize & Approve".
 */
export default function FinalCheck({ invoice, onFinalized }) {
  const [submitting, setSubmitting] = useState(false);
  const [advanceDeduction, setAdvanceDeduction] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [holdAmount, setHoldAmount] = useState(0);
  const [holdReason, setHoldReason] = useState('');
  const [holdPhotos, setHoldPhotos] = useState([]);

  const items = invoice?.items || [];
  const grossTotal = items.reduce((s, i) => s + (i.total || 0), 0);
  const deductions = advanceDeduction + penalty + holdAmount;
  const netPayable = Math.max(0, grossTotal - deductions);

  const billDate = invoice?.date
    ? dayjs(invoice.date)
    : getNextSaturday();
  const billNumber = invoice?.number ?? '-';
  const year = invoice?.year ?? new Date().getFullYear();

  function getNextSaturday() {
    const d = dayjs();
    const day = d.day();
    const add = day === 6 ? 7 : day === 0 ? 6 : 6 - day;
    return d.add(add, 'day');
  }

  useEffect(() => {
    if (invoice?.adjustments) {
      const a = invoice.adjustments;
      setAdvanceDeduction(a.advanceDeduction ?? 0);
      setPenalty(a.penalty ?? 0);
      setHoldAmount(a.holdAmount ?? 0);
      setHoldReason(a.holdReason ?? '');
      setHoldPhotos(Array.isArray(a.holdPhotos) ? a.holdPhotos : []);
    }
  }, [invoice]);

  const handleFinalize = async () => {
    if (holdAmount > 0 && !holdReason.trim()) {
      message.warning('Please select Hold Reason when Audit Hold is set.');
      return;
    }
    setSubmitting(true);
    try {
      const adjustments = {
        advanceDeduction,
        penalty,
        holdAmount,
        holdReason: holdAmount > 0 ? holdReason : '',
        holdPhotos: holdAmount > 0 ? (Array.isArray(holdPhotos) ? holdPhotos : [holdPhotos]) : [],
      };
      const toId = (v) => (v && typeof v === 'object' && v._id ? v._id : v);
      const contractorId = toId(invoice?.sourceContractorId);
      if (!contractorId) {
        message.error('Invoice has no contractor; cannot finalize.');
        setSubmitting(false);
        return;
      }
      const auditChecklist = (invoice?.auditChecklist || []).map((a) => ({
        workAssignId: String(toId(a.workAssignId) ?? ''),
        isAudited: a.isAudited,
        remarks: a.remarks ?? '',
      }));
      const finalChecklist = auditChecklist.map((a) => ({
        workAssignId: String(a.workAssignId ?? ''),
        isFinalized: true,
      }));
      const items = (invoice?.items || []).map((i) => ({
        _id: i._id ?? '',
        itemName: i.itemName,
        description: i.description ?? '',
        quantity: Number(i.quantity),
        price: Number(i.price),
        total: Number(i.total),
      }));
      const payload = {
        sourceContractorId: contractorId,
        number: invoice?.number ?? 0,
        year: invoice?.year ?? new Date().getFullYear(),
        status: invoice?.status ?? 'draft',
        notes: invoice?.notes ?? '',
        expiredDate: invoice?.expiredDate,
        date: invoice?.date,
        items,
        taxRate: invoice?.taxRate ?? 0,
        billType: invoice?.billType,
        billingStage: 'final_check',
        billingPeriod: invoice?.billingPeriod,
        billingWeekEnd: invoice?.billingWeekEnd,
        billingWeekStart: invoice?.billingWeekStart,
        sourceProjectId: toId(invoice?.sourceProjectId),
        plannedWorkIds: Array.isArray(invoice?.plannedWorkIds)
          ? invoice.plannedWorkIds.map((v) => String(toId(v) ?? '')).filter(Boolean)
          : undefined,
        auditChecklist,
        finalChecklist,
        adjustments,
        onHoldReasons: invoice?.onHoldReasons,
        onHoldPhotos: invoice?.onHoldPhotos,
      };
      const res = await request.update({
        entity: 'invoice',
        id: invoice._id,
        jsonData: payload,
      });
      if (res?.success) {
        message.success('Bill finalized. Proceed to Approval.');
        onFinalized?.(res.result);
      } else {
        message.error(res?.message || 'Failed to finalize');
      }
    } catch (e) {
      message.error('Failed to finalize');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'Item', dataIndex: 'itemName', key: 'itemName' },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v) => v || '-' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' },
    { title: 'Rate (₹)', dataIndex: 'price', key: 'price', width: 100, align: 'right', render: (v) => (v != null ? Number(v).toFixed(2) : '-') },
    { title: 'Amount (₹)', dataIndex: 'total', key: 'total', width: 120, align: 'right', render: (v) => (v != null ? Number(v).toFixed(2) : '-') },
  ];

  return (
    <Card title="Final Check" size="small" style={{ color: '#333' }} className="billing-final-check-card">
      <Table
        rowKey={(r, i) => r._id || i}
        columns={columns}
        dataSource={items}
        pagination={false}
        size="small"
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={4} align="right"><strong>Gross Total</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><strong>₹{grossTotal.toFixed(2)}</strong></Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />

      <Card size="small" title="Adjustments" style={{ marginTop: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <span>Advance Deduction (₹)</span>
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                value={advanceDeduction}
                onChange={(v) => setAdvanceDeduction(Number(v) || 0)}
              />
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <span>Penalty (₹)</span>
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                value={penalty}
                onChange={(v) => setPenalty(Number(v) || 0)}
              />
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <span>Audit Hold (₹)</span>
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                value={holdAmount}
                onChange={(v) => setHoldAmount(Number(v) || 0)}
              />
            </Space>
          </Col>
          {holdAmount > 0 && (
            <>
              <Col span={24}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span>Hold Reason <span style={{ color: '#ff4d4f' }}>*</span></span>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Select a reason"
                    allowClear
                    options={HOLD_REASONS}
                    value={holdReason || undefined}
                    onChange={setHoldReason}
                  />
                </Space>
              </Col>
              <Col span={24}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span>Hold Photos (optional)</span>
                  <ImageUpload
                    label=""
                    value={Array.isArray(holdPhotos) ? holdPhotos[0] : holdPhotos}
                    onChange={(v) => setHoldPhotos(v ? [v] : [])}
                  />
                </Space>
              </Col>
            </>
          )}
        </Row>
      </Card>

      <Card size="small" style={{ marginTop: 16 }}>
        <Row gutter={[16, 8]}>
          <Col span={12}>Contractor</Col>
          <Col span={12} style={{ textAlign: 'right' }}><strong>{invoice?.sourceContractorId?.name || '-'}</strong></Col>
          <Col span={12}>Bill Number</Col>
          <Col span={12} style={{ textAlign: 'right' }}><strong>{billNumber}/{year}</strong></Col>
          <Col span={12}>Bill Date</Col>
          <Col span={12} style={{ textAlign: 'right' }}>{billDate.format('DD/MM/YYYY')}</Col>
          <Col span={12}>Deductions (Advance + Penalty + Hold)</Col>
          <Col span={12} style={{ textAlign: 'right' }}>₹{deductions.toFixed(2)}</Col>
          <Col span={12}><strong>Net Payable</strong></Col>
          <Col span={12} style={{ textAlign: 'right' }}><strong>₹{netPayable.toFixed(2)}</strong></Col>
        </Row>
      </Card>

      <div style={{ marginTop: 24 }}>
        <Button
          type="primary"
          size="large"
          icon={<CheckOutlined />}
          onClick={handleFinalize}
          loading={submitting}
        >
          Finalize
        </Button>
      </div>
    </Card>
  );
}
