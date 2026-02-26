import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  DatePicker,
  Row,
  Col,
  Steps,
  Button,
  Space,
  Input,
  Spin,
  message,
} from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { ErpLayout } from '@/layout';
import SelectAsync from '@/components/SelectAsync';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import dayjs from 'dayjs';
import request from '@/request/request';
import { useSelector, useDispatch } from 'react-redux';
import { selectFinanceSettings } from '@/redux/settings/selectors';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';
import { settingsAction } from '@/redux/settings/actions';
import { isInProgress } from './utils/billingStage';

function billingStageToStep(billingStage) {
  if (billingStage === 'final_check') return 2;
  if (billingStage === 'approved') return 3;
  return 1; // draft or audit_check → Final Check step
}

import AuditCheck from './components/AuditCheck';
import FinalCheck from './components/FinalCheck';
import PrintBill from './components/PrintBill';
import ApprovalStep from './components/ApprovalStep';
import LedgerStep from './components/LedgerStep';

const { Content } = Layout;

const STEPS = [
  { title: '1. Draft & Audit Check', key: 'draft_audit' },
  { title: '2. Final Check', key: 'final' },
  { title: '3. Approval', key: 'approval' },
  { title: '4. Ledger', key: 'ledger' },
];

function getLastSaturday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return dayjs(d);
}

export default function BillingFromPlanning() {
  const dispatch = useDispatch();
  const currentProject = useSelector(selectCurrentProject);
  const shouldLockProject = useSelector(selectShouldLockProject);
  const { last_invoice_number } = useSelector(selectFinanceSettings) || {};
  const [projectId, setProjectId] = useState(undefined);
  const [projectName, setProjectName] = useState('');
  const [contractorId, setContractorId] = useState(undefined);
  const [contractorName, setContractorName] = useState('');
  const [weekEnd, setWeekEnd] = useState(getLastSaturday());
  const [currentStep, setCurrentStep] = useState(0);
  const [draftInvoice, setDraftInvoice] = useState(null);
  const [inProgressBills, setInProgressBills] = useState([]);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const resumeId = searchParams.get('resume');

  useEffect(() => {
    if (shouldLockProject && currentProject?._id) {
      setProjectId(currentProject._id);
      setProjectName(currentProject.name || '');
    }
  }, [shouldLockProject, currentProject]);

  useEffect(() => {
    dispatch(settingsAction.list({ entity: 'setting' }));
  }, [dispatch]);

  useEffect(() => {
    if (projectId && typeof projectId === 'string') {
      request.read({ entity: 'project', id: projectId }).then((res) => {
        if (res?.result?.name) setProjectName(res.result.name);
      }).catch(() => setProjectName(''));
    } else {
      setProjectName('');
    }
  }, [projectId]);

  // Fetch in-progress bills for "Resume" (From Planning only)
  useEffect(() => {
    request.list({ entity: 'invoice', options: { page: 1, items: 100 } })
      .then((data) => {
        const list = data?.result || [];
        const inProgress = list.filter(isInProgress);
        setInProgressBills(inProgress);
      })
      .catch(() => setInProgressBills([]));
  }, []);

  // Resume from URL ?resume=id or when user picks a bill
  useEffect(() => {
    if (!resumeId) return;
    setResumeLoading(true);
    request.read({ entity: 'invoice', id: resumeId })
      .then((res) => {
        const inv = res?.result;
        if (!inv) {
          setResumeLoading(false);
          return;
        }
        if (!isInProgress(inv)) {
          message.info('This bill is not in progress. Start a new bill or open it from All Bills.');
          setResumeLoading(false);
          return;
        }
        const toId = (v) => (v && typeof v === 'object' && v._id ? v._id : v);
        setDraftInvoice(inv);
        setCurrentStep(billingStageToStep(inv.billingStage));
        setProjectId(toId(inv.sourceProjectId) || undefined);
        setContractorId(toId(inv.sourceContractorId) || undefined);
        setContractorName(inv.sourceContractorId?.name ?? '');
        if (inv.billingWeekEnd) setWeekEnd(dayjs(inv.billingWeekEnd));
        setSearchParams({}, { replace: true });
      })
      .catch(() => {})
      .finally(() => setResumeLoading(false));
  }, [resumeId]);

  const handleResumeBill = (inv) => {
    setSearchParams({ resume: inv._id }, { replace: true });
  };

  const handleSendToFinalCheck = (invoice) => {
    setDraftInvoice(invoice);
    setCurrentStep(1);
  };

  const handleFinalized = (updatedInvoice) => {
    setDraftInvoice(updatedInvoice);
    setCurrentStep(2);
  };

  const handleApproved = (updatedInvoice) => {
    setDraftInvoice(updatedInvoice);
    setCurrentStep(3);
  };

  const handlePrevious = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  return (
    <ErpLayout>
      <Content style={{ padding: '32px 24px' }}>
        <div className="page-content-inner">
          <h1 className="page-title">Create Bill from Planning</h1>
          <p style={{ color: '#8c8c8c', marginBottom: 24 }}>
            Bill a contractor against their completed work. Draft & Audit Check → Final Check → Approval → Ledger (record payment).
          </p>

          {resumeLoading && (
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <Spin tip="Loading bill…" />
            </div>
          )}

          {!resumeLoading && inProgressBills.length > 0 && (
            <Card size="small" style={{ marginBottom: 24, background: '#f6ffed', borderColor: '#b7eb8f' }} className="resume-bills-card">
              <div style={{ marginBottom: 8, fontWeight: 600, color: '#389e0d' }}>
                <PlayCircleOutlined style={{ marginRight: 6 }} />
                Resume a bill in progress ({inProgressBills.length})
              </div>
              <Space wrap size="small">
                {inProgressBills.map((inv) => (
                  <Button
                    key={inv._id}
                    size="small"
                    onClick={() => handleResumeBill(inv)}
                  >
                    #{inv.number ?? '-'}/{inv.year ?? '-'} · {inv.contractorDisplayName || inv.sourceContractorId?.name || 'Contractor'}
                  </Button>
                ))}
              </Space>
            </Card>
          )}

          {/* Filters - always visible */}
          <Card size="small" style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span style={{ fontWeight: 500 }}>Project <span style={{ color: '#ff4d4f' }}>*</span></span>
                  {shouldLockProject && currentProject ? (
                    <Input
                      readOnly
                      disabled
                      value={currentProject.projectCode ? `${currentProject.name} (${currentProject.projectCode})` : currentProject.name}
                      style={{ color: 'rgba(0,0,0,0.88)', cursor: 'not-allowed' }}
                    />
                  ) : (
                    <SelectAsync
                      entity="project"
                      displayLabels={['name']}
                      placeholder="Select Project"
                      value={projectId}
                      onChange={setProjectId}
                    />
                  )}
                </Space>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span style={{ fontWeight: 500 }}>Contractor</span>
                  <AutoCompleteAsync
                    entity="vendor"
                    displayLabels={['name']}
                    searchFields="name"
                    value={contractorId}
                    onChange={(val, option) => {
                      setContractorId(val);
                      setContractorName(option?.name ?? '');
                    }}
                    placeholder="Search and select contractor"
                  />
                </Space>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span style={{ fontWeight: 500 }}>Week Ending (Saturday)</span>
                  <DatePicker
                    style={{ width: '100%' }}
                    value={weekEnd}
                    onChange={(d) => setWeekEnd(d || getLastSaturday())}
                    allowClear={false}
                  />
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Fixed 4-stage progress indicator - always visible from mount */}
          <Steps
            current={currentStep}
            items={STEPS.map((s) => ({ title: s.title, key: s.key }))}
            style={{ marginBottom: 24 }}
            className="billing-steps"
          />

          {/* Step content */}
          <div style={{ color: '#333' }} className="billing-step-content">
            {currentStep === 0 && (
              <AuditCheck
                projectId={projectId}
                contractorId={contractorId}
                weekEnd={weekEnd}
                lastInvoiceNumber={last_invoice_number}
                onSendToFinalCheck={handleSendToFinalCheck}
                disabled={!projectId}
              />
            )}

            {currentStep === 1 && draftInvoice && (
              <FinalCheck
                invoice={draftInvoice}
                onFinalized={handleFinalized}
              />
            )}

            {currentStep === 1 && !draftInvoice && (
              <Card className="billing-step-card" style={{ color: '#333' }}>
                <p style={{ color: '#333', margin: 0 }}>No draft invoice. Complete step 1 (Draft & Audit Check) first.</p>
              </Card>
            )}

            {currentStep === 2 && draftInvoice && (
              <ApprovalStep invoice={draftInvoice} onApproved={handleApproved} />
            )}

            {currentStep === 3 && !draftInvoice && (
              <Card className="billing-step-card" style={{ color: '#333' }}>
                <p style={{ color: '#333', margin: 0 }}>Complete previous steps first.</p>
              </Card>
            )}

            {currentStep === 3 && draftInvoice && (
              <>
                <PrintBill
                  invoice={draftInvoice}
                  projectName={projectName}
                  contractorName={contractorName || draftInvoice?.sourceContractorId?.name}
                />
                <div style={{ marginTop: 24 }}>
                  <LedgerStep
                    invoice={draftInvoice}
                    projectName={projectName}
                    contractorName={contractorName || draftInvoice?.sourceContractorId?.name}
                  />
                </div>
              </>
            )}

            {currentStep === 2 && !draftInvoice && (
              <Card className="billing-step-card" style={{ color: '#333' }}>
                <p style={{ color: '#333', margin: 0 }}>Complete previous steps first.</p>
              </Card>
            )}
          </div>

          {/* Persistent Previous navigation */}
          <div style={{ marginTop: 24 }}>
            {currentStep > 0 && (
              <Button icon={<ArrowLeftOutlined />} onClick={handlePrevious}>
                Previous
              </Button>
            )}
          </div>
        </div>
      </Content>
      <style>{`
        .billing-steps .ant-steps-item-title { color: #333 !important; }
        .billing-steps .ant-steps-item-description { color: #666 !important; }
        .billing-step-content,
        .billing-step-content .ant-card,
        .billing-step-content .ant-table { color: #333; }
        .billing-step-content .ant-input,
        .billing-step-content .ant-input-number-input { color: #000; background: #fff; border: 1px solid #d9d9d9; }
      `}</style>
    </ErpLayout>
  );
}
