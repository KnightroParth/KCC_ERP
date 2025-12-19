// frontend/src/pages/Inventory/InventoryDashboard.jsx

import React, { useState, useEffect } from 'react';
import { Table, Tag, Select, Card, Statistic, Row, Col } from 'antd';
import axios from 'axios';
import { request } from '@/request';
import SelectAsync from '@/components/SelectAsync';
import storePersist from '@/redux/storePersist';

export default function InventoryDashboard() {
  const [projectId, setProjectId] = useState(null);
  const [inventoryData, setInventoryData] = useState([]);
  const [totals, setTotals] = useState({ totalReceived: 0, totalConsumed: 0, totalValue: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadDashboard();
    }
  }, [projectId]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const auth = storePersist.get('auth');
      const token = auth?.current?.token;
      
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:8888/'}api/inventory/inventory/dashboard?projectId=${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      ).then(res => res.data).catch(err => ({ result: { items: [], totals: {} } }));

      if (res?.result) {
        setInventoryData(res.result.items || []);
        setTotals(res.result.totals || {});
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Material Name',
      key: 'material',
      width: '25%',
      render: (_, record) => {
        const material = record.material;
        if (!material) return '-';
        if (typeof material === 'object') {
          return material.name || '-';
        }
        return '-';
      },
    },
    {
      title: 'Category',
      key: 'category',
      width: '15%',
      render: (_, record) => {
        const material = record.material;
        if (material && typeof material === 'object') {
          return material.category || '-';
        }
        return '-';
      },
    },
    {
      title: 'UOM',
      key: 'uom',
      width: '10%',
      render: (_, record) => {
        const material = record.material;
        if (material && typeof material === 'object') {
          return material.uom || '-';
        }
        return '-';
      },
    },
    {
      title: 'Total In',
      dataIndex: 'totalReceived',
      key: 'totalReceived',
      width: '12%',
      render: (qty, record) => {
        const material = record.material;
        const uom = material?.uom || 'nos';
        return `${(qty || 0).toFixed(2)} ${uom}`;
      },
    },
    {
      title: 'Total Out',
      dataIndex: 'totalConsumed',
      key: 'totalConsumed',
      width: '12%',
      render: (qty, record) => {
        const material = record.material;
        const uom = material?.uom || 'nos';
        return `${(qty || 0).toFixed(2)} ${uom}`;
      },
    },
    {
      title: 'Current Balance',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: '12%',
      render: (qty, record) => {
        const material = record.material;
        const uom = material?.uom || 'nos';
        const color = qty > 0 ? 'green' : qty === 0 ? 'orange' : 'red';
        return <Tag color={color}>{qty || 0} {uom}</Tag>;
      },
    },
    {
      title: 'Avg Rate',
      dataIndex: 'avgRate',
      key: 'avgRate',
      width: '10%',
      render: (rate) => `₹${(rate || 0).toFixed(2)}`,
    },
    {
      title: 'Value',
      key: 'value',
      width: '10%',
      render: (_, record) => {
        const value = (record.currentStock || 0) * (record.avgRate || 0);
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="Inventory Dashboard" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ marginRight: 8, fontWeight: 'bold' }}>Select Project:</label>
          <SelectAsync
            entity="project"
            displayLabels={['name', 'projectCode']}
            outputValue="_id"
            placeholder="Select Project"
            value={projectId}
            onChange={setProjectId}
            style={{ width: 300 }}
          />
        </div>

        {projectId && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Total Received"
                  value={totals.totalReceived}
                  precision={2}
                  suffix="units"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Total Consumed"
                  value={totals.totalConsumed}
                  precision={2}
                  suffix="units"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Total Inventory Value"
                  value={totals.totalValue}
                  precision={2}
                  prefix="₹"
                />
              </Card>
            </Col>
          </Row>
        )}
      </Card>

      {projectId && (
        <Card title="Material Inventory Summary">
          <Table
            dataSource={inventoryData}
            columns={columns}
            loading={loading}
            rowKey={(record) => record._id || record.material?._id}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} materials`,
            }}
          />
        </Card>
      )}

      {!projectId && (
        <Card>
          <p style={{ textAlign: 'center', color: '#999', fontSize: '16px' }}>
            Please select a project to view inventory dashboard
          </p>
        </Card>
      )}
    </div>
  );
}
