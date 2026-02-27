import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Button, message, Space, Modal, Select, Popconfirm, Image, Descriptions, Tooltip, Input } from 'antd';
import { ExportOutlined, SendOutlined, PauseCircleOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '@/request/request';
import { HOLD_REASONS } from '@/config/workConfig';

/**
 * Flatten a potentially nested checklist data object into [{ label, value, checked }] pairs.
 * Includes ALL items — both marked (truthy) and unmarked (falsy) — so the
 * full checklist is visible with ✓ / ✗ indicators.
 */
function flattenChecklistData(data, prefix = '') {
  if (!data || typeof data !== 'object') return [];
  const entries = [];
  Object.entries(data).forEach(([key, val]) => {
    if (key === 'carryForwarded') return; // skip internal flags
    const label = prefix ? `${prefix} › ${key}` : key;
    if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val) && val !== '') {
      entries.push(...flattenChecklistData(val, label));
    } else {
      // Determine checked status
      const isChecked = val === true || (typeof val === 'string' && val.trim() !== '') || (typeof val === 'number' && val !== 0);
      entries.push({
        label,
        value: isChecked
          ? (typeof val === 'boolean' ? '✓ Yes' : String(val))
          : '✗ No',
        checked: isChecked,
      });
    }
  });
  return entries;
}



/**
 * Audit Check: Table of billable lines (from PlannedWork) with bulk checkbox.
 * Columns: Activity Name, Location (Wing/Floor/Unit), Rate, Qty, Amount.
 * Actions: Select All, Export to Excel (CSV), Send to Final Check.
 * Photos & Checklist are available by clicking the expand (+) button on each row.
 */
export default function AuditCheck({
  projectId,
  contractorId,
  weekEnd,
  lastInvoiceNumber = 0,
  onSendToFinalCheck,
  disabled,
}) {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [sending, setSending] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [selectedHoldReason, setSelectedHoldReason] = useState('');
  /** Per-row remarks (keyed by row _id); shown in bill and PDF/Excel */
  const [rowRemarks, setRowRemarks] = useState({});

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
    {
      title: 'Remark',
      key: 'remark',
      width: 160,
      render: (_, r) => (
        <Input
          placeholder="Optional remark for bill"
          value={rowRemarks[r._id] ?? ''}
          onChange={(e) => setRowRemarks((prev) => ({ ...prev, [r._id]: e.target.value }))}
          size="small"
          allowClear
        />
      ),
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

  const handleSendToFinalCheck = async () => {
    if (!canSend) return;
    setSending(true);
    try {
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

      const subTotal = items.reduce((s, i) => s + i.total, 0);
      const billToContractorId = contractorId || selectedRows[0]?.contractorId?._id || selectedRows[0]?.contractorId;
      const payload = {
        sourceContractorId: billToContractorId,
        number: 0,
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
          remarks: rowRemarks[r._id] != null ? String(rowRemarks[r._id]).trim() : '',
        })),
      };

      payload.number = (lastInvoiceNumber || 0) + 1;

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

  const buildDraftPayload = (overrides = {}) => {
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
      date: weekEndDate,
      expiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items,
      taxRate: 0,
      billType: 'normal',
      billingPeriod: { start: weekStartDate, end: weekEndDate },
      billingWeekEnd: weekEndDate,
      billingWeekStart: weekStartDate,
      sourceProjectId: projectId || selectedRows[0]?.projectId?._id || selectedRows[0]?.projectId,
      plannedWorkIds: selectedRows.map((r) => (r._id != null ? String(r._id) : null)).filter(Boolean),
      auditChecklist: selectedRows.map((r) => ({
        workAssignId: r._id != null ? String(r._id) : '',
        isAudited: true,
        remarks: rowRemarks[r._id] != null ? String(rowRemarks[r._id]).trim() : '',
      })),
      ...overrides,
    };
    return payload;
  };

  const handlePutOnHold = () => {
    setSelectedHoldReason('');
    setHoldModalOpen(true);
  };

  const submitHold = async () => {
    if (!selectedHoldReason || !canSend) return;
    setSending(true);
    try {
      const payload = buildDraftPayload({
        status: 'on hold',
        billingStage: 'on_hold',
        holdReason: selectedHoldReason,
        onHoldReasons: selectedHoldReason,
      });
      const res = await request.create({ entity: 'invoice', jsonData: payload });
      if (res?.success && res?.result) {
        message.success('Bill put on hold');
        setHoldModalOpen(false);
        setSelectedHoldReason('');
        navigate('/invoice');
      } else {
        message.error(res?.message || 'Failed to put on hold');
      }
    } catch (e) {
      message.error('Failed to put on hold');
    } finally {
      setSending(false);
    }
  };

  const handleSuspend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const payload = buildDraftPayload({
        status: 'suspended',
        billingStage: 'suspended',
      });
      const res = await request.create({ entity: 'invoice', jsonData: payload });
      if (res?.success && res?.result) {
        message.success('Bill suspended');
        navigate('/invoice');
      } else {
        message.error(res?.message || 'Failed to suspend');
      }
    } catch (e) {
      message.error('Failed to suspend');
    } finally {
      setSending(false);
    }
  };

  const expandedRowRender = (record) => {
    const ad = record.activityData || {};
    const photos = ad.photos || {};
    const checklistEntries = flattenChecklistData(ad.data);
    const hasPhotos = photos.before || photos.after;
    const hasChecklist = checklistEntries.length > 0;

    if (!hasPhotos && !hasChecklist) {
      return (
        <div style={{ padding: '12px 24px', color: '#888', fontStyle: 'italic' }}>
          No photos or checklist data available for this activity.
        </div>
      );
    }

    return (
      <div
        style={{
          padding: '20px',
          background: '#fcfcfc',
          borderRadius: 8,
          border: '1px solid #f0f0f0',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.02)',
        }}
      >
        {hasPhotos && (
          <div style={{ marginBottom: hasChecklist ? 20 : 0 }}>
            <Image.PreviewGroup>
              <Space size="large" wrap>
                {photos.before ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: 6, fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: '0.05em' }}>BEFORE</div>
                    <Image
                      src={photos.before}
                      alt="Before"
                      width={180}
                      height={140}
                      style={{ objectFit: 'cover', borderRadius: 6, border: '2px solid #fadb14', cursor: 'zoom-in' }}
                      preview={{ mask: <span style={{ fontSize: 12 }}>🔍 View</span> }}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', width: 180 }}>
                    <div style={{ marginBottom: 6, fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: '0.05em' }}>BEFORE</div>
                    <div style={{
                      width: 180, height: 140, background: '#f5f5f5', borderRadius: 6,
                      border: '1px dashed #d9d9d9', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#bbb', fontSize: 11
                    }}>
                      No photo
                    </div>
                  </div>
                )}
                {photos.after ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: 6, fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: '0.05em' }}>AFTER</div>
                    <Image
                      src={photos.after}
                      alt="After"
                      width={180}
                      height={140}
                      style={{ objectFit: 'cover', borderRadius: 6, border: '2px solid #52c41a', cursor: 'zoom-in' }}
                      preview={{ mask: <span style={{ fontSize: 12 }}>🔍 View</span> }}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', width: 180 }}>
                    <div style={{ marginBottom: 6, fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: '0.05em' }}>AFTER</div>
                    <div style={{
                      width: 180, height: 140, background: '#f5f5f5', borderRadius: 6,
                      border: '1px dashed #d9d9d9', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#bbb', fontSize: 11
                    }}>
                      No photo
                    </div>
                  </div>
                )}
              </Space>
            </Image.PreviewGroup>
          </div>
        )}

        {hasChecklist && (
          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2, md: 3 }}
            style={{ fontSize: 12, background: '#fff' }}
          >
            {checklistEntries.map((entry, i) => (
              <Descriptions.Item
                key={i}
                label={
                  <Tooltip title={entry.label}>
                    <span style={{ fontWeight: 500, color: '#555' }}>
                      {entry.label.length > 35 ? entry.label.slice(0, 35) + '…' : entry.label}
                    </span>
                  </Tooltip>
                }
              >
                <span style={{
                  color: entry.checked ? '#389e0d' : '#cf1322',
                  fontWeight: 600,
                }}>
                  {entry.value}
                </span>
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </div>
    );
  };

  return (


    <div className="billing-audit-container">
      {/* Billing Audit Table */}
      <Card title="Audit Check (Draft bill to contractor)" size="small" style={{ color: '#333' }} className="billing-audit-check-card">
        <Space style={{ marginBottom: 16 }} wrap>
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
            Next: Final Check
          </Button>
          <Button
            icon={<PauseCircleOutlined />}
            onClick={handlePutOnHold}
            loading={sending}
            disabled={!canSend}
          >
            Hold
          </Button>
          <Popconfirm
            title="Are you sure you want to suspend this bill?"
            onConfirm={handleSuspend}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<StopOutlined />} loading={sending} disabled={!canSend}>
              Suspend
            </Button>
          </Popconfirm>
        </Space>
        <Modal
          title="Reasons for Hold"
          open={holdModalOpen}
          onCancel={() => { setHoldModalOpen(false); setSelectedHoldReason(''); }}
          onOk={submitHold}
          okText="Put on Hold"
          confirmLoading={sending}
          okButtonProps={{ disabled: !selectedHoldReason }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <span style={{ fontWeight: 500 }}>Select reason</span>
            <Select
              style={{ width: '100%' }}
              placeholder="Select a reason"
              allowClear
              options={HOLD_REASONS}
              value={selectedHoldReason || undefined}
              onChange={setSelectedHoldReason}
            />
          </Space>
        </Modal>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data}
          loading={loading}
          rowSelection={rowSelection}
          expandable={{
            expandedRowRender,
            defaultExpandAllRows: false,
          }}
          pagination={{ pageSize: 15 }}
          size="small"
          scroll={{ x: 600 }}
          summary={() =>
            selectedRows.length > 0 ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5} align="right">
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
    </div>
  );
}
