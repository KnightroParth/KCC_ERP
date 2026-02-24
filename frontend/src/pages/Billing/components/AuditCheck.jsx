import React, { useState, useEffect } from 'react';
import { Table, Card, Button, message, Space, Modal, Select } from 'antd';
import { ExportOutlined, SendOutlined, PauseCircleOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '@/request/request';

const REASONS_FOR_HOLD = [
  { value: 'audit_hold', label: 'Audit hold' },
  { value: 'quality_hold', label: 'Quality hold' },
  { value: 'pending', label: 'Pending' },
];

/**
 * Audit Check: Table of billable lines (from PlannedWork) with bulk checkbox.
 * Columns: Activity Name, Location (Wing/Floor/Unit), Rate, Qty, Amount.
 * Actions: Hold, Suspend (when not up to mark), Export to Excel, Send to Final Check.
 */
export default function AuditCheck({
  projectId,
  contractorId,
  weekEnd,
  lastInvoiceNumber = 0,
  onSendToFinalCheck,
  disabled,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [sending, setSending] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdActionType, setHoldActionType] = useState('hold'); // 'hold' | 'suspend'
  const [holdReason, setHoldReason] = useState('');
  const [holdSubmitting, setHoldSubmitting] = useState(false);

  useEffect(() => {
    if (!weekEnd) return;
    setLoading(true);
    const params = {
      weekEnd: weekEnd.toISOString ? weekEnd.toISOString() : new Date(weekEnd).toISOString(),
    };
    if (projectId) params.projectId = projectId;
    if (contractorId) params.contractorId = contractorId;
    request
      .getPlanningForBilling(params)
      .then((res) => {
        if (res?.success && res.result) setData(res.result);
        else setData([]);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [weekEnd, projectId, contractorId]);

  const columns = [
    {
      title: 'Activity Name',
      key: 'activityName',
      render: (_, r) => r.workType || r.category || '-',
      width: 180,
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, r) =>
        [r.buildingName, r.floor, r.unitNumber].filter(Boolean).join(' / ') || '-',
      width: 200,
    },
    {
      title: 'Rate (₹)',
      dataIndex: 'rate',
      key: 'rate',
      width: 100,
      align: 'right',
      render: (v) => (v != null ? Number(v).toFixed(2) : '-'),
    },
    {
      title: 'Qty',
      dataIndex: 'qty',
      key: 'qty',
      width: 80,
      align: 'right',
      render: (_, r) => r.qty ?? 1,
    },
    {
      title: 'Amount (₹)',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (_, r) => {
        const qty = r.qty ?? 1;
        const rate = r.rate ?? 0;
        return (qty * rate).toFixed(2);
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  const selectedRows = data.filter((r) => selectedRowKeys.includes(r._id));
  const grossTotal = selectedRows.reduce((sum, r) => sum + ((r.qty ?? 1) * (r.rate ?? 0)), 0);
  const canSend = selectedRows.length > 0 && !disabled;

  const handleExport = () => {
    const headers = ['Activity Name', 'Location', 'Rate', 'Qty', 'Amount'];
    const rows = data.map((r) => {
      const loc = [r.buildingName, r.floor, r.unitNumber].filter(Boolean).join(' / ');
      const qty = r.qty ?? 1;
      const amount = (qty * (r.rate ?? 0)).toFixed(2);
      return [r.workType || r.category || '', loc, r.rate ?? '', qty, amount];
    });
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-draft-${weekEnd?.format?.('YYYY-MM-DD') || 'export'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    message.success('Exported to CSV');
  };

  function buildDraftPayload(overrides = {}) {
    const we = dayjs(weekEnd);
    const weekEndDate = we.toISOString();
    const weekStartDate = we.subtract(6, 'day').toISOString();
    const items = selectedRows.map((r) => {
      const qty = r.qty ?? 1;
      const rate = r.rate ?? 0;
      const itemName = [r.workType || r.category, r.buildingName, r.unitNumber].filter(Boolean).join(' - ');
      return {
        itemName,
        description: r.unitType ? `Unit: ${r.unitType}` : '',
        quantity: qty,
        price: rate,
        total: qty * rate,
      };
    });
    const billToContractorId = contractorId || selectedRows[0]?.contractorId?._id || selectedRows[0]?.contractorId;
    const payload = {
      sourceContractorId: billToContractorId,
      number: (lastInvoiceNumber || 0) + 1,
      year: new Date().getFullYear(),
      status: 'draft',
      date: weekEndDate,
      expiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items,
      taxRate: 0,
      billType: 'normal',
      billingStage: 'audit_check',
      billingPeriod: { start: weekStartDate, end: weekEndDate },
      billingWeekEnd: weekEndDate,
      billingWeekStart: weekStartDate,
      sourceProjectId: projectId || selectedRows[0]?.projectId?._id || selectedRows[0]?.projectId,
      plannedWorkIds: selectedRows.map((r) => (r._id != null ? String(r._id) : null)).filter(Boolean),
      auditChecklist: selectedRows.map((r) => ({
        workAssignId: r._id != null ? String(r._id) : '',
        isAudited: true,
        remarks: '',
      })),
      ...overrides,
    };
    return payload;
  }

  const handleHoldOrSuspend = (action) => {
    if (!canSend) {
      message.warning('Please select at least one line to hold or suspend.');
      return;
    }
    setHoldActionType(action);
    setHoldReason('');
    setHoldModalOpen(true);
  };

  const submitHoldOrSuspend = async () => {
    if (!holdReason.trim()) {
      message.warning('Please select a reason for hold.');
      return;
    }
    setHoldSubmitting(true);
    try {
      const label = REASONS_FOR_HOLD.find((o) => o.value === holdReason)?.label || holdReason;
      const payload = buildDraftPayload({
        billingStage: 'on_hold',
        status: 'on hold',
        onHoldReasons: label,
        onHoldPhotos: [],
      });
      const res = await request.create({ entity: 'invoice', jsonData: payload });
      if (res?.success && res?.result) {
        message.success(holdActionType === 'suspend' ? 'Bill suspended. It will not proceed to Final Check until released. You can view or release it from All Bills.' : 'Bill held. It will not proceed to Final Check until released. You can view or release it from All Bills.');
        setHoldModalOpen(false);
        setHoldReason('');
      } else {
        message.error(res?.message || 'Failed to hold/suspend bill');
      }
    } catch (e) {
      message.error('Failed to hold/suspend bill');
    } finally {
      setHoldSubmitting(false);
    }
  };

  const handleSendToFinalCheck = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const payload = buildDraftPayload();
      const res = await request.create({ entity: 'invoice', jsonData: payload });
      if (res?.success && res?.result) {
        message.success('Sent to Final Check');
        onSendToFinalCheck?.(res.result);
      } else {
        message.error(res?.message || 'Failed to create draft');
      }
    } catch (e) {
      message.error('Failed to send to Final Check');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card title="Audit Check (Draft bill to contractor)" size="small" style={{ color: '#333' }} className="billing-audit-check-card">
      <Space style={{ marginBottom: 16 }} wrap>
        <Button
          icon={<PauseCircleOutlined />}
          onClick={() => handleHoldOrSuspend('hold')}
          disabled={!canSend}
        >
          Hold
        </Button>
        <Button
          icon={<StopOutlined />}
          onClick={() => handleHoldOrSuspend('suspend')}
          disabled={!canSend}
        >
          Suspend
        </Button>
        <Button icon={<ExportOutlined />} onClick={handleExport} disabled={!data.length}>
          Export to Excel (CSV)
        </Button>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSendToFinalCheck}
          loading={sending}
          disabled={!canSend}
        >
          Send to Final Check
        </Button>
      </Space>
      <Modal
        title={holdActionType === 'suspend' ? 'Suspend bill' : 'Hold bill'}
        open={holdModalOpen}
        onCancel={() => { setHoldModalOpen(false); setHoldReason(''); }}
        onOk={submitHoldOrSuspend}
        okText={holdActionType === 'suspend' ? 'Suspend' : 'Hold'}
        confirmLoading={holdSubmitting}
        width={400}
        destroyOnClose
      >
        <p style={{ marginBottom: 8, color: '#666' }}>
          This bill will not be sent to Final Check. Select a reason and release it from All Bills when ready.
        </p>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <span>Reasons for hold <span style={{ color: '#ff4d4f' }}>*</span></span>
          <Select
            style={{ width: '100%' }}
            placeholder="Select reason"
            value={holdReason || undefined}
            onChange={(v) => setHoldReason(v || '')}
            options={REASONS_FOR_HOLD}
            allowClear
          />
        </Space>
      </Modal>
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowSelection={rowSelection}
        pagination={{ pageSize: 15 }}
        size="small"
        scroll={{ x: 600 }}
        summary={() =>
          selectedRows.length > 0 ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4} align="right">
                <strong>Gross Total (selected)</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong>₹{grossTotal.toFixed(2)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          ) : null
        }
      />
    </Card>
  );
}
