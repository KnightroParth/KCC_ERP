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
import { getClubbedBillRows } from '../utils/billFormatHelpers';

/**
 * Final Check: Shows audited items, adjustments panel (advance, penalty, hold),
 * hold reason + photos when hold amount > 0, Bill Number/Date, "Finalize & Approve".
 */
export default function FinalCheck({ invoice, onFinalized }) {
  const [submitting, setSubmitting] = useState(false);
  const [advanceDeduction, setAdvanceDeduction] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [holdAmount, setHoldAmount] = useState(0);
  const [securityHoldPercent, setSecurityHoldPercent] = useState(0);
  const [holdReason, setHoldReason] = useState('');
  const [holdPhotos, setHoldPhotos] = useState([]);

  const items = invoice?.items || [];
  const grossTotal = items.reduce((s, i) => s + (i.total || 0), 0);
  const securityHoldAmount = (grossTotal * (securityHoldPercent || 0)) / 100;
  const deductions = advanceDeduction + penalty + holdAmount + securityHoldAmount;
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
      setSecurityHoldPercent(a.securityHoldPercent ?? 0);
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
        securityHoldPercent: securityHoldPercent || 0,
        securityHoldAmount: (grossTotal * (securityHoldPercent || 0)) / 100,
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

  const clubbedRows = getClubbedBillRows(invoice);
  const billColumns = [
    { title: 'Work Type', dataIndex: 'workType', key: 'workType', ellipsis: true, width: 200 },
    { title: 'Build No / Flats', dataIndex: 'buildNo', key: 'buildNo', width: 160, ellipsis: true, render: (v) => v || '-' },
    { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 72 },
    { title: 'No. of Flat', dataIndex: 'noOfFlat', key: 'noOfFlat', width: 88, align: 'right' },
    { title: 'Rate', dataIndex: 'rate', key: 'rate', width: 80, align: 'right', render: (v) => Number(v || 0).toFixed(2) },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 88, align: 'right', render: (v) => Number(v || 0).toFixed(2) },
    {
      title: 'Audit Check',
      dataIndex: 'isAudited',
      key: 'auditCheck',
      width: 88,
      align: 'center',
      render: (v) => (v ? <CheckOutlined style={{ color: '#166534', fontSize: 18 }} /> : ''),
    },
    {
      title: 'Final Check',
      dataIndex: 'isFinalized',
      key: 'finalCheck',
      width: 88,
      align: 'center',
      render: (v) => (v ? <CheckOutlined style={{ color: '#166534', fontSize: 18 }} /> : ''),
    },
    { title: 'Remark', dataIndex: 'remark', key: 'remark', width: 120, ellipsis: true },
  ];

  return (
    <Card title="Final Check" size="small" style={{ color: '#333' }} className="billing-final-check-card">
      <p style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
        Bill as it will appear (same Work Type + Unit + Amount clubbed in one line). Review and finalize below.
      </p>
      <Table
        rowKey={(r, i) => `clubbed-${i}-${r.workType}-${r.unit}-${r.amount}`}
        columns={billColumns}
        dataSource={clubbedRows}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 1000 }}
        className="bill-preview-excel-table"
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={5} align="right"><strong>Gross Total</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><strong>₹{grossTotal.toFixed(2)}</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={2} colSpan={3} />
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
          <Col xs={24} sm={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <span>Security Hold (% of billed amount)</span>
              <Select
                style={{ width: '100%' }}
                value={securityHoldPercent}
                onChange={(v) => setSecurityHoldPercent(Number(v) ?? 0)}
                options={[
                  { value: 0, label: '0%' },
                  { value: 5, label: '5%' },
                  { value: 10, label: '10%' },
                ]}
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
          <Col span={12}>Security Hold ({securityHoldPercent}%)</Col>
          <Col span={12} style={{ textAlign: 'right' }}>₹{securityHoldAmount.toFixed(2)}</Col>
          <Col span={12}>Deductions (Advance + Penalty + Hold + Security Hold)</Col>
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
