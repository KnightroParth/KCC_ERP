import React, { useState } from 'react';
import {
  Layout,
  Card,
  Select,
  DatePicker,
  Table,
  Button,
  Row,
  Col,
  Typography,
  Space,
} from 'antd';
import { ErpLayout } from '@/layout';
import SelectAsync from '@/components/SelectAsync';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title } = Typography;
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

// Mock data for placeholder table
const MOCK_TABLE_DATA = [
  { key: '1', itemDescription: 'RCC Work - Slab', unit: 'Cum', rate: 8500, prevQty: 10, currentQty: 12, amount: 102000 },
  { key: '2', itemDescription: 'Brick Work', unit: 'Cft', rate: 18, prevQty: 500, currentQty: 520, amount: 9360 },
  { key: '3', itemDescription: 'Plastering', unit: 'Sqm', rate: 95, prevQty: 200, currentQty: 210, amount: 19950 },
];

const columns = [
  { title: 'Item Description', dataIndex: 'itemDescription', key: 'itemDescription' },
  { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 80 },
  { title: 'Rate', dataIndex: 'rate', key: 'rate', width: 100, align: 'right', render: (v) => `₹${v}` },
  { title: 'Prev Qty', dataIndex: 'prevQty', key: 'prevQty', width: 100, align: 'right' },
  { title: 'Current Qty', dataIndex: 'currentQty', key: 'currentQty', width: 100, align: 'right' },
  { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, align: 'right', render: (v) => `₹${v}` },
];

export default function BillingFromPlanning() {
  const [projectId, setProjectId] = useState(undefined);
  const [contractorId, setContractorId] = useState(undefined);
  const [weekEnd, setWeekEnd] = useState(getLastSaturday());

  return (
    <ErpLayout>
      <Content style={{ padding: '24px' }}>
        <Card>
          <Title level={4} style={{ marginBottom: 24 }}>Project RA Bill Generation</Title>

          {/* Filters */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={8}>
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
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <span style={{ fontWeight: 500 }}>Contractor / Client</span>
                <SelectAsync
                  entity="vendor"
                  displayLabels={['name']}
                  placeholder="Select Contractor or Client"
                  value={contractorId}
                  onChange={setContractorId}
                />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
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

          {/* Placeholder Table */}
          <Table
            columns={columns}
            dataSource={MOCK_TABLE_DATA}
            rowKey="key"
            pagination={false}
            size="small"
            scroll={{ x: 600 }}
          />

          {/* Footer */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" disabled>
              Draft Bill
            </Button>
          </div>
        </Card>
      </Content>
    </ErpLayout>
  );
}
