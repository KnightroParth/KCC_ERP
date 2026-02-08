import React, { useState } from 'react';
import { Card, Steps, Button, Modal, Input, message } from 'antd';
import { PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import request from '@/request/request';
import ImageUpload from '@/components/ImageUpload';

const STAGES = [
  { key: 'draft', label: 'Draft' },
  { key: 'audit', label: 'Audit Check' },
  { key: 'checking', label: 'Final Check' },
  { key: 'approval', label: 'Approval' },
  { key: 'payment', label: 'Ledger / Payment' },
];

// Backend may use audit_check / approved; map to strip keys
function normalizeStage(s) {
  if (s === 'audit_check') return 'audit';
  if (s === 'approved') return 'approval';
  return s;
}

export default function BillingWorkflowStrip({ invoice, onRefresh }) {
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdReasons, setHoldReasons] = useState('');
  const [holdPhotos, setHoldPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const rawStage = invoice?.billingStage || 'draft';
  const stage = normalizeStage(rawStage);
  const isOnHold = stage === 'on_hold' || invoice?.status === 'on hold';
  const currentIndex = isOnHold ? -1 : STAGES.findIndex((s) => s.key === stage);
  const canAdvance = currentIndex >= 0 && currentIndex < STAGES.length - 1;
  const nextStage = canAdvance ? STAGES[currentIndex + 1] : null;

  const handleAdvanceStage = async () => {
    if (!nextStage || !invoice?._id) return;
    setSubmitting(true);
    try {
      const payload = {
        ...invoice,
        billingStage: nextStage.key,
        status: nextStage.key === 'payment' ? invoice.status : invoice.status,
      };
      const res = await request.update({
        entity: 'invoice',
        id: invoice._id,
        jsonData: payload,
      });
      if (res?.success) {
        message.success(`Moved to ${nextStage.label}`);
        onRefresh?.();
      } else message.error(res?.message || 'Failed to update');
    } catch (e) {
      message.error('Failed to update stage');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePutOnHold = () => {
    setHoldReasons(invoice?.onHoldReasons || '');
    setHoldPhotos(invoice?.onHoldPhotos || []);
    setHoldModalOpen(true);
  };

  const submitHold = async () => {
    if (!invoice?._id) return;
    setSubmitting(true);
    try {
      const payload = {
        ...invoice,
        billingStage: 'on_hold',
        status: 'on hold',
        onHoldReasons: holdReasons,
        onHoldPhotos: Array.isArray(holdPhotos) ? holdPhotos : holdPhotos ? [holdPhotos] : [],
      };
      const res = await request.update({
        entity: 'invoice',
        id: invoice._id,
        jsonData: payload,
      });
      if (res?.success) {
        message.success('Bill put on hold');
        setHoldModalOpen(false);
        setHoldReasons('');
        setHoldPhotos([]);
        onRefresh?.();
      } else message.error(res?.message || 'Failed');
    } catch (e) {
      message.error('Failed to put on hold');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResume = async () => {
    if (!invoice?._id) return;
    setSubmitting(true);
    try {
      const payload = {
        ...invoice,
        billingStage: 'draft',
        status: 'draft',
        onHoldReasons: '',
        onHoldPhotos: [],
      };
      const res = await request.update({
        entity: 'invoice',
        id: invoice._id,
        jsonData: payload,
      });
      if (res?.success) {
        message.success('Resumed to Draft');
        onRefresh?.();
      } else message.error(res?.message || 'Failed');
    } catch (e) {
      message.error('Failed to resume');
    } finally {
      setSubmitting(false);
    }
  };

  if (!invoice) return null;
  const showWorkflow = invoice.billType === 'normal' || invoice.billingStage != null;

  if (!showWorkflow) return null;

  // For draft/audit bills, show compact status only (no repeat of full 5-step workflow)
  const isDraftOnly = (rawStage === 'draft' || rawStage === 'audit_check') && !isOnHold;
  if (isDraftOnly) {
    return (
      <>
        <Card size="small" title="Billing Status" style={{ marginBottom: 24 }}>
          <div style={{ color: '#666', fontSize: 14 }}>
            {rawStage === 'audit_check'
              ? 'Audit done — use Billing → Billing from Planning for Final Check and Print.'
              : 'Draft — use Billing → Billing from Planning to run Audit Check and Final Check.'}
          </div>
        </Card>
        <Modal
          title="Put Bill on Hold"
          open={holdModalOpen}
          onCancel={() => setHoldModalOpen(false)}
          onOk={submitHold}
          okText="Put on Hold"
          confirmLoading={submitting}
          width={560}
        >
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Reasons</label>
            <Input.TextArea
              rows={3}
              value={holdReasons}
              onChange={(e) => setHoldReasons(e.target.value)}
              placeholder="Enter reason(s) for putting this bill on hold"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Photos</label>
            <ImageUpload
              label="Add photo (optional)"
              value={Array.isArray(holdPhotos) ? holdPhotos[0] : holdPhotos}
              onChange={(v) => setHoldPhotos(v ? [v] : [])}
            />
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <Card size="small" title="Billing Status" style={{ marginBottom: 24 }}>
        <Steps
          current={isOnHold ? undefined : currentIndex < 0 ? 0 : currentIndex}
          status={isOnHold ? 'wait' : 'process'}
          items={STAGES.map((s, i) => ({
            title: s.label,
            description:
              isOnHold && i === 0 ? 'On Hold' : stage === s.key ? 'Current' : i < currentIndex ? 'Done' : '',
          }))}
        />
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isOnHold ? (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleResume}
              loading={submitting}
            >
              Resume from Hold
            </Button>
          ) : (
            <>
              {nextStage && (
                <Button type="primary" onClick={handleAdvanceStage} loading={submitting}>
                  Send to {nextStage.label}
                </Button>
              )}
              {stage !== 'on_hold' && (
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={handlePutOnHold}
                  loading={submitting}
                >
                  Put on Hold
                </Button>
              )}
            </>
          )}
        </div>
        {invoice.onHoldReasons && (
          <div style={{ marginTop: 12, padding: 8, background: '#fffbe6', borderRadius: 4 }}>
            <strong>On hold reason:</strong> {invoice.onHoldReasons}
          </div>
        )}
      </Card>

      <Modal
        title="Put Bill on Hold"
        open={holdModalOpen}
        onCancel={() => setHoldModalOpen(false)}
        onOk={submitHold}
        okText="Put on Hold"
        confirmLoading={submitting}
        width={560}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Reasons</label>
          <Input.TextArea
            rows={3}
            value={holdReasons}
            onChange={(e) => setHoldReasons(e.target.value)}
            placeholder="Enter reason(s) for putting this bill on hold"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Photos</label>
          <ImageUpload
            label="Add photo (optional)"
            value={Array.isArray(holdPhotos) ? holdPhotos[0] : holdPhotos}
            onChange={(v) => setHoldPhotos(v ? [v] : [])}
          />
        </div>
      </Modal>
    </>
  );
}
