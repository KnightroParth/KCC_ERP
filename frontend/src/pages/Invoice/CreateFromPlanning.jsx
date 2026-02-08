import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Card,
  Select,
  DatePicker,
  Table,
  Checkbox,
  Button,
  message,
  Spin,
  Empty,
  Row,
  Col,
} from 'antd';
import { FileTextOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '@/request/request';
import { useDispatch, useSelector } from 'react-redux';
import { settingsAction } from '@/redux/settings/actions';
import { selectFinanceSettings } from '@/redux/settings/selectors';
import { ErpLayout } from '@/layout';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';

const { Content } = Layout;
const { Option } = Select;

/** Get last Saturday (default week ending) */
function getLastSaturday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return dayjs(d);
}

export default function CreateFromPlanning() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { last_invoice_number } = useSelector(selectFinanceSettings) || {};
  const [weekEnd, setWeekEnd] = useState(getLastSaturday());
  const [projectId, setProjectId] = useState(null);
  const [contractorId, setContractorId] = useState(null);
  const [contractorId, setContractorId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [planningData, setPlanningData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    dispatch(settingsAction.list({ entity: 'setting' }));
  }, [dispatch]);

  useEffect(() => {
    const fetch = async () => {
      const [pRes, vRes] = await Promise.all([
        request.listAll({ entity: 'project' }),
        request.listAll({ entity: 'vendor' }),
      ]);
      if (pRes?.success && pRes.result) setProjects(pRes.result);
      if (vRes?.success && vRes.result) setVendors(vRes.result);
    };
    fetch();
  }, []);

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
        if (res?.success && res.result) {
          setPlanningData(res.result);
          setSelectedRowKeys([]);
        } else {
          setPlanningData([]);
        }
      })
      .catch(() => setPlanningData([]))
      .finally(() => setLoading(false));
  }, [weekEnd, projectId, contractorId]);

  const selectedRows = planningData.filter((r) => selectedRowKeys.includes(r._id));
  const subtotal = selectedRows.reduce((sum, r) => sum + (r.rate || 0), 0);

  const handleCreateDraftBill = async () => {
    if (!contractorId) {
      message.warning('Please select a Contractor');
      return;
    }
    if (selectedRows.length === 0) {
      message.warning('Please select at least one planning row');
      return;
    }
    if (last_invoice_number === undefined) {
      message.warning('Settings not loaded. Please try again.');
      return;
    }

    const weekEndDate = weekEnd.toISOString ? weekEnd.toISOString() : new Date(weekEnd).toISOString();
    const weekStartDate = dayjs(weekEnd).subtract(6, 'day').toISOString();

    const items = selectedRows.map((row) => {
      const rate = row.rate || 0;
      const itemName = [row.workType || row.category, row.buildingName, row.unitNumber].filter(Boolean).join(' - ');
      return {
        itemName,
        description: row.unitType ? `Unit type: ${row.unitType}` : '',
        quantity: 1,
        price: rate,
        total: rate,
      };
    });

    const payload = {
      sourceContractorId: contractorId,
      number: (last_invoice_number || 0) + 1,
      year: new Date().getFullYear(),
      status: 'draft',
      notes: `Bill from planning - week ending ${dayjs(weekEnd).format('DD/MM/YYYY')}`,
      date: weekEndDate,
      expiredDate: dayjs(weekEnd).add(30, 'day').toISOString(),
      items,
      taxRate: 0,
      billType: 'normal',
      billingStage: 'draft',
      billingWeekEnd: weekEndDate,
      billingWeekStart: weekStartDate,
      sourceProjectId: projectId || selectedRows[0]?.projectId?._id || selectedRows[0]?.projectId,
      sourceContractorId: contractorId || selectedRows[0]?.contractorId?._id || selectedRows[0]?.contractorId,
      plannedWorkIds: selectedRows.map((r) => r._id),
    };

    setCreating(true);
    try {
      const res = await request.create({ entity: 'invoice', jsonData: payload });
      if (res?.success && res?.result) {
        message.success('Draft bill created');
        navigate(`/invoice/read/${res.result._id}`);
      } else {
        message.error(res?.message || 'Failed to create draft bill');
      }
    } catch (e) {
      message.error('Failed to create draft bill');
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      title: '',
      key: 'select',
      width: 48,
      render: (_, record) => (
        <Checkbox
          checked={selectedRowKeys.includes(record._id)}
          onChange={(e) => {
            if (e.target.checked) setSelectedRowKeys((k) => [...k, record._id]);
            else setSelectedRowKeys((k) => k.filter((id) => id !== record._id));
          }}
        />
      ),
    },
    { title: 'Work Type', dataIndex: 'workType', key: 'workType', render: (t, r) => t || r.category },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Building', dataIndex: 'buildingName', key: 'buildingName' },
    { title: 'Unit', dataIndex: 'unitNumber', key: 'unitNumber' },
    { title: 'Floor', dataIndex: 'floor', key: 'floor', render: (v) => v || '-' },
    {
      title: 'Rate (₹)',
      dataIndex: 'rate',
      key: 'rate',
      align: 'right',
      render: (v) => (v != null ? Number(v).toFixed(2) : '-'),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  return (
    <ErpLayout>
      <Content style={{ padding: '24px' }}>
        <Card
          className="create-from-planning-card"
          style={{ color: '#333' }}
          title={
            <span style={{ color: '#333' }}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              Create Bill from Planning (Weekly – Saturday)
            </span>
          }
          extra={
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={handleCreateDraftBill}
              loading={creating}
              disabled={selectedRows.length === 0 || !contractorId}
            >
              Create Draft Bill
            </Button>
          }
        >
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col>
              <span style={{ marginRight: 8, fontWeight: 500 }}>Week ending (Saturday)</span>
              <DatePicker
                value={weekEnd}
                onChange={(d) => setWeekEnd(d || getLastSaturday())}
                allowClear={false}
                suffixIcon={<CalendarOutlined />}
              />
            </Col>
            <Col>
              <span style={{ marginRight: 8, fontWeight: 500 }}>Project</span>
              <Select
                placeholder="All projects"
                allowClear
                style={{ width: 220 }}
                value={projectId}
                onChange={setProjectId}
                showSearch
                optionFilterProp="label"
                options={projects.map((p) => ({ label: p.name || p.projectCode, value: p._id }))}
              />
            </Col>
            <Col>
              <span style={{ marginRight: 8, fontWeight: 500 }}>Contractor</span>
              <Select
                placeholder="All contractors"
                allowClear
                style={{ width: 220 }}
                value={contractorId}
                onChange={setContractorId}
                showSearch
                optionFilterProp="label"
                options={vendors.map((v) => ({ label: v.name, value: v._id }))}
              />
            </Col>
            <Col>
              <span style={{ marginRight: 8, fontWeight: 500 }}>Contractor (required)</span>
              <AutoCompleteAsync
                entity="vendor"
                displayLabels={['name']}
                searchFields="name"
                value={contractorId}
                onChange={(v) => setContractorId(v)}
                style={{ width: 220 }}
                placeholder="Select contractor"
              />
            </Col>
          </Row>

          <Spin spinning={loading}>
            <div style={{ color: '#333' }} className="create-from-planning-content">
            {planningData.length === 0 && !loading ? (
              <Empty description="No planning data for this week. Select a different week or add planning first." />
            ) : (
              <>
                <Table
                  rowKey="_id"
                  columns={columns}
                  dataSource={planningData}
                  rowSelection={rowSelection}
                  pagination={{ pageSize: 15 }}
                  size="small"
                  scroll={{ x: 700 }}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">
                        <strong>Subtotal (selected)</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong>₹{subtotal.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </>
            )}
            </div>
          </Spin>
        </Card>
        <style>{`
          .create-from-planning-card,
          .create-from-planning-card .ant-card-head-title { color: #333 !important; }
          .create-from-planning-content .ant-table { color: #333; }
          .create-from-planning-content .ant-select-selector,
          .create-from-planning-content .ant-input { color: #000; background: #fff; }
        `}</style>
      </Content>
    </ErpLayout>
  );
}
