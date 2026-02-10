import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Statistic, Row, Col, message, Input } from 'antd';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { request } from '@/request';
import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';
import SelectAsync from '@/components/SelectAsync';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';
import dayjs from 'dayjs';

// Helper function to include token (same pattern as request utility)
function includeToken() {
  axios.defaults.baseURL = API_BASE_URL;
  axios.defaults.withCredentials = true;
  const auth = storePersist.get('auth');
  if (auth) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${auth.current.token}`;
  }
}

export default function InventoryDashboard() {
  const currentProject = useSelector(selectCurrentProject);
  const shouldLockProject = useSelector(selectShouldLockProject);
  const [projectId, setProjectId] = useState(null);
  const [inventoryData, setInventoryData] = useState([]);
  const [totals, setTotals] = useState({ totalReceived: 0, totalConsumed: 0, totalValue: 0 });
  const [loading, setLoading] = useState(false);
  const [pendingShipments, setPendingShipments] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(false);

  useEffect(() => {
    if (shouldLockProject && currentProject?._id) {
      setProjectId(currentProject._id);
    }
  }, [shouldLockProject, currentProject]);

  useEffect(() => {
    if (projectId) {
      loadDashboard();
    }
  }, [projectId]);

  useEffect(() => {
    loadPendingShipments();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      includeToken();
      const response = await axios.get(
        `inventory/inventory/dashboard?projectId=${projectId}`
      );
      
      if (response?.data?.result) {
        setInventoryData(response.data.result.items || []);
        setTotals(response.data.result.totals || {});
      } else if (response?.data?.success && response?.data?.result) {
        setInventoryData(response.data.result.items || []);
        setTotals(response.data.result.totals || {});
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingShipments = async () => {
    setLoadingShipments(true);
    try {
      const res = await request.list({ 
        entity: 'inventory/purchase-order', 
        options: { 
          status: 'Issued',
          items: 100
        } 
      });

      if (res?.success && res?.result) {
        // Filter and sort by expected delivery date (expiredDate) - soonest first
        const shipments = res.result
          .filter(po => po?.expiredDate)
          .map(po => ({
            ...po,
            expiredDate: dayjs(po.expiredDate),
          }))
          .sort((a, b) => {
            if (!a.expiredDate || !b.expiredDate) return 0;
            return a.expiredDate.valueOf() - b.expiredDate.valueOf();
          });
        
        setPendingShipments(shipments);
      }
    } catch (error) {
      console.error('Error loading pending shipments:', error);
    } finally {
      setLoadingShipments(false);
    }
  };

  // Calculate total stock value
  const totalStockValue = inventoryData.reduce((sum, record) => {
    const value = (record.currentStock || 0) * (record.avgRate || 0);
    return sum + value;
  }, 0);

  const columns = [
    {
      title: 'Material Name',
      key: 'material',
      width: '25%',
      render: (_, record) => {
        const material = record?.material;
        if (!material) return '-';
        if (typeof material === 'object') {
          return material?.name || '-';
        }
        return '-';
      },
    },
    {
      title: 'Category',
      key: 'category',
      width: '15%',
      render: (_, record) => {
        const material = record?.material;
        if (material && typeof material === 'object') {
          return material?.category || '-';
        }
        return '-';
      },
    },
    {
      title: 'UOM',
      key: 'uom',
      width: '10%',
      render: (_, record) => {
        const material = record?.material;
        if (material && typeof material === 'object') {
          return material?.uom || '-';
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
        const material = record?.material;
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
        const material = record?.material;
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
        const material = record?.material;
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

  const shipmentColumns = [
    {
      title: 'Supplier Name',
      key: 'supplier',
      width: '30%',
      render: (_, record) => {
        const supplier = record?.supplier;
        if (!supplier) return '-';
        if (typeof supplier === 'object') {
          return supplier?.name || '-';
        }
        return '-';
      },
    },
    {
      title: 'Project',
      key: 'project',
      width: '30%',
      render: (_, record) => {
        const requirement = record?.referenceRequirement;
        if (!requirement) return '-';
        if (typeof requirement === 'object') {
          const project = requirement?.projectId;
          if (project && typeof project === 'object') {
            return project?.name || project?.projectCode || '-';
          }
        }
        return '-';
      },
    },
    {
      title: 'Expected Delivery Date',
      key: 'expiredDate',
      width: '25%',
      render: (_, record) => {
        if (record?.expiredDate) {
          const date = dayjs.isDayjs(record.expiredDate) 
            ? record.expiredDate 
            : dayjs(record.expiredDate);
          return date.format('DD/MM/YYYY');
        }
        return '-';
      },
    },
    {
      title: 'PO Number',
      key: 'poNumber',
      width: '15%',
      render: (_, record) => {
        if (record?.number && record?.year) {
          return `PO-${record.year}-${String(record.number).padStart(4, '0')}`;
        }
        return '-';
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="Inventory Dashboard" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ marginRight: 8, fontWeight: 'bold' }}>Project:</label>
          {shouldLockProject && currentProject ? (
            <Input
              readOnly
              disabled
              value={currentProject.projectCode ? `${currentProject.name} (${currentProject.projectCode})` : currentProject.name}
              style={{ width: 300, color: 'rgba(0,0,0,0.88)', cursor: 'not-allowed' }}
            />
          ) : (
            <SelectAsync
              entity="project"
              displayLabels={['name', 'projectCode']}
              outputValue="_id"
              placeholder="Select Project"
              value={projectId}
              onChange={setProjectId}
              style={{ width: 300 }}
            />
          )}
        </div>

        {projectId && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Received"
                  value={totals.totalReceived}
                  precision={2}
                  suffix="units"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Consumed"
                  value={totals.totalConsumed}
                  precision={2}
                  suffix="units"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Inventory Value"
                  value={totals.totalValue}
                  precision={2}
                  prefix="₹"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Stock Value"
                  value={totalStockValue}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#52c41a', fontSize: '20px', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>
        )}
      </Card>

      {/* Expected Incoming Shipments Section */}
      <Card 
        title="Incoming Deliveries" 
        style={{ marginBottom: 24 }}
        loading={loadingShipments}
      >
        {pendingShipments.length > 0 ? (
          <Table
            dataSource={pendingShipments}
            columns={shipmentColumns}
            rowKey={(record) => record?._id}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} pending shipments`,
            }}
            size="small"
          />
        ) : (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
            No pending shipments found
          </p>
        )}
      </Card>

      {projectId && (
        <Card title="Material Inventory Summary">
          <Table
            dataSource={inventoryData}
            columns={columns}
            loading={loading}
            rowKey={(record) => record?._id || record?.material?._id}
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
