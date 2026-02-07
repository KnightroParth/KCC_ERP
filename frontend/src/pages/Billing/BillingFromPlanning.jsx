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
} from 'antd';
import { ErpLayout } from '@/layout';
import SelectAsync from '@/components/SelectAsync';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import dayjs from 'dayjs';
import request from '@/request/request';
import { useSelector } from 'react-redux';
import { selectFinanceSettings } from '@/redux/settings/selectors';
import { settingsAction } from '@/redux/settings/actions';
import { useDispatch } from 'react-redux';

import AuditCheck from './components/AuditCheck';
import FinalCheck from './components/FinalCheck';
import PrintBill from './components/PrintBill';

const { Content } = Layout;

const STEPS = [
  { title: 'Draft / Audit Check', key: 'audit' },
  { title: 'Final Check', key: 'final' },
  { title: 'Print Bill', key: 'print' },
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
  const { last_invoice_number } = useSelector(selectFinanceSettings) || {};
  const [projectId, setProjectId] = useState(undefined);
  const [projectName, setProjectName] = useState('');
  const [contractorId, setContractorId] = useState(undefined);
  const [clientId, setClientId] = useState(undefined);
  const [weekEnd, setWeekEnd] = useState(getLastSaturday());
  const [currentStep, setCurrentStep] = useState(0);
  const [draftInvoice, setDraftInvoice] = useState(null);

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

  const handleSendToFinalCheck = (invoice) => {
    setDraftInvoice(invoice);
    setCurrentStep(1);
  };

  const handleFinalized = (updatedInvoice) => {
    setDraftInvoice(updatedInvoice);
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  return (
    <ErpLayout>
      <Content style={{ padding: '32px 24px' }}>
        <div className="page-content-inner">
          <h1 className="page-title">Project RA Bill Generation</h1>
          <p style={{ color: '#8c8c8c', marginBottom: 24 }}>Planning (100% complete) → Draft → Audit Check → Final Check → Print</p>

          {/* Filters - always visible */}
          <Card size="small" style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span style={{ fontWeight: 500 }}>Project <span style={{ color: '#ff4d4f' }}>*</span></span>
                  <SelectAsync
                    entity="project"
                    displayLabels={['name']}
                    placeholder="Select Project"
                    value={projectId}
                    onChange={setProjectId}
                  />
                </Space>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span style={{ fontWeight: 500 }}>Contractor / Client</span>
                  <SelectAsync
                    entity="vendor"
                    displayLabels={['name']}
                    placeholder="Select Contractor"
                    value={contractorId}
                    onChange={setContractorId}
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
              <Col xs={24} sm={12} md={6}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <span style={{ fontWeight: 500 }}>Bill To (Client) <span style={{ color: '#ff4d4f' }}>*</span></span>
                  <AutoCompleteAsync
                    entity="client"
                    displayLabels={['name']}
                    searchFields="name"
                    value={clientId}
                    onChange={setClientId}
                  />
                </Space>
              </Col>
            </Row>
          </Card>

          <Steps current={currentStep} items={STEPS.map((s, i) => ({ title: s.title, key: s.key }))} style={{ marginBottom: 24 }} />

          {currentStep > 0 && (
            <Button onClick={handleBack} style={{ marginBottom: 16 }}>
              Back
            </Button>
          )}

          {/* Step content */}
          {currentStep === 0 && (
            <AuditCheck
              projectId={projectId}
              contractorId={contractorId}
              weekEnd={weekEnd}
              clientId={clientId}
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

          {currentStep === 2 && draftInvoice && (
            <PrintBill
              invoice={draftInvoice}
              projectName={projectName}
            />
          )}

          {currentStep === 1 && !draftInvoice && (
            <Card><p>No draft invoice. Complete Audit Check first.</p></Card>
          )}
          {currentStep === 2 && !draftInvoice && (
            <Card><p>No bill to print. Complete Final Check first.</p></Card>
          )}
        </div>
      </Content>
    </ErpLayout>
  );
}
