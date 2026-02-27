import React, { useState } from 'react';
import { Card, Button, message } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import request from '@/request/request';
import BillPreviewExcelFormat from './BillPreviewExcelFormat';

/**
 * Step 3: Approval — Show bill in Excel format (category of work, unit, amount in one line),
 * with KCC logo at top, Download PDF and Download Excel options; then Approve.
 */
export default function ApprovalStep({ invoice, onApproved, projectName = '', contractorName: contractorNameProp }) {
  const [submitting, setSubmitting] = useState(false);

  const contractorName =
    contractorNameProp ??
    invoice?.sourceContractorId?.name ??
    (typeof invoice?.sourceContractorId === 'object' ? invoice?.sourceContractorId?.name : '-');

  const handleApprove = async () => {
    if (!invoice?._id) return;
    setSubmitting(true);
    try {
      const toId = (v) => (v && typeof v === 'object' && v._id ? v._id : v);
      const plannedWorkIds = Array.isArray(invoice?.plannedWorkIds)
        ? invoice.plannedWorkIds.map((v) => String(toId(v) ?? '')).filter(Boolean)
        : undefined;
      const auditChecklist = (invoice?.auditChecklist || []).map((a) => ({
        workAssignId: String(toId(a.workAssignId) ?? ''),
        isAudited: a.isAudited,
        remarks: a.remarks ?? '',
      }));
      const finalChecklist = (invoice?.finalChecklist || []).map((f) => ({
        workAssignId: String(toId(f.workAssignId) ?? ''),
        isFinalized: f.isFinalized,
      }));
      const { _id, created, updated, ...invoiceRest } = invoice;
      const payload = {
        ...invoiceRest,
        billingStage: 'approved',
        status: 'pending',
        sourceContractorId: toId(invoice?.sourceContractorId),
        sourceProjectId: toId(invoice?.sourceProjectId),
        ...(plannedWorkIds !== undefined && { plannedWorkIds }),
        auditChecklist,
        finalChecklist,
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
    <>
      {/* Bill view in Excel format: KCC logo at top, Work Type | Build No | Unit | No. of Flat | Rate | Amount, then PDF & Excel download */}
      <BillPreviewExcelFormat
        invoice={invoice}
        projectName={projectName}
        contractorName={contractorName}
        showDownloadButtons
      />

      <Card title="Approval" size="small" style={{ color: '#333' }} className="billing-approval-step-card">
        <p style={{ marginBottom: 16, color: '#666' }}>
          Review the bill above. Use <strong>Download PDF</strong> or <strong>Download Excel</strong> if needed. Click <strong>Approve</strong> to formally set the bill status to Approved so it can be paid and posted to the ledger.
        </p>
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
    </>
  );
}
