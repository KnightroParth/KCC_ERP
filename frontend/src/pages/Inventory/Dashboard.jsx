import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Statistic, Row, Col, message, Button, Space, Tooltip } from 'antd';
import { FilePdfOutlined, ArrowUpOutlined, ArrowDownOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';
import { request } from '@/request';
import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';
import SelectAsync from '@/components/SelectAsync';
import dayjs from 'dayjs';
import { generateInventoryPDF } from '@/utils/pdfGenerator';

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
  const [projectId, setProjectId] = useState(null);
  const [inventoryData, setInventoryData] = useState([]);
  const [totals, setTotals] = useState({ totalReceived: 0, totalConsumed: 0, totalValue: 0 });
  const [loading, setLoading] = useState(false);
  const [pendingShipments, setPendingShipments] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [pendingIndents, setPendingIndents] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    if (projectId) {
      loadDashboard();
      loadRecentTransactions();
    }
  }, [projectId]);

  useEffect(() => {
    loadPendingShipments();
    loadPendingIndents();
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
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      if (error?.response?.status === 401) {
        message.error('Session expired. Please login again.');
      } else {
        message.error('Failed to load dashboard data: ' + errorMessage);
      }
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
      const errorMessage = error?.message || 'Unknown error';
      // Silent fail for pending shipments - not critical
      if (error?.response?.status === 401) {
        message.error('Session expired. Please login again.');
      }
    } finally {
      setLoadingShipments(false);
    }
  };

  // Calculate total stock value
  const totalStockValue = inventoryData.reduce((sum, record) => {
    const value = (record.currentStock || 0) * (record.avgRate || 0);
    return sum + value;
  }, 0);

  // Load pending indents
  const loadPendingIndents = async () => {
    try {
      const res = await request.list({ 
        entity: 'inventory/requirement',
        options: { status: 'Pending', items: 100 }
      });
      if (res?.success && res?.result) {
        setPendingIndents(res.result.length || 0);
      }
    } catch (error) {
      // Silent fail for pending indents - not critical
      if (error?.response?.status === 401) {
        message.error('Session expired. Please login again.');
      }
    }
  };

  // Load recent transactions
  const loadRecentTransactions = async () => {
    if (!projectId) return;
    try {
      const res = await request.list({
        entity: 'inventory/transaction',
        options: {
          projectId: projectId,
          items: 5,
          sort: 'date',
          sortBy: 'desc'
        }
      });
      if (res?.success && res?.result) {
        setRecentTransactions(res.result || []);
      }
    } catch (error) {
      // Silent fail for recent transactions - not critical
      if (error?.response?.status === 401) {
        message.error('Session expired. Please login again.');
      }
    }
  };

  // Identify low stock items
  useEffect(() => {
    const lowStock = inventoryData.filter(item => {
      const stock = item.currentStock || 0;
      // Consider low stock if less than 10% of total received or less than threshold
      const threshold = Math.max(10, (item.totalReceived || 0) * 0.1);
      return stock > 0 && stock < threshold;
    });
    setLowStockItems(lowStock);
  }, [inventoryData]);

  // Export dashboard PDF
  const handleExportPDF = async () => {
    if (!projectId) {
      message.warning('Please select a project first');
      return;
    }
    try {
      const project = inventoryData[0]?.projectId;
      const projectName = project?.name || project?.projectCode || 'All Projects';
      
      await generateInventoryPDF({
        title: 'Inventory Dashboard',
        subtitle: `Project: ${projectName}`,
        columns: columns.map(col => ({
          title: col.title,
          dataIndex: col.dataIndex || col.key,
          key: col.key,
        })),
        data: inventoryData,
        meta: {
          'Project': projectName,
          'Total Stock Value': `₹${totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          'Total Received': `${totals.totalReceived.toFixed(2)} units`,
          'Total Consumed': `${totals.totalConsumed.toFixed(2)} units`,
        },
        filename: `inventory-dashboard-${projectName}-${dayjs().format('YYYY-MM-DD')}.pdf`,
      });
      message.success('PDF exported successfully');
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error';
      message.error('Failed to export PDF: ' + errorMessage);
    }
  };

  const columns = [
    {
      title: 'Material Name',
      key: 'material',
      width: '25%',
      sorter: (a, b) => {
        const aName = a?.material?.name || '';
        const bName = b?.material?.name || '';
        if (!aName && !bName) return 0;
        if (!aName) return 1;
        if (!bName) return -1;
        return aName.localeCompare(bName);
      },
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
      sorter: (a, b) => {
        const aCat = a?.material?.category || '';
        const bCat = b?.material?.category || '';
        if (!aCat && !bCat) return 0;
        if (!aCat) return 1;
        if (!bCat) return -1;
        return aCat.localeCompare(bCat);
      },
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
      sorter: (a, b) => {
        const aVal = a?.totalReceived || 0;
        const bVal = b?.totalReceived || 0;
        return aVal - bVal;
      },
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
      sorter: (a, b) => {
        const aVal = a?.totalConsumed || 0;
        const bVal = b?.totalConsumed || 0;
        return aVal - bVal;
      },
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
      sorter: (a, b) => {
        const aVal = a?.currentStock || 0;
        const bVal = b?.currentStock || 0;
        return aVal - bVal;
      },
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
      sorter: (a, b) => {
        const aVal = a?.avgRate || 0;
        const bVal = b?.avgRate || 0;
        return aVal - bVal;
      },
      render: (rate) => `₹${(rate || 0).toFixed(2)}`,
    },
    {
      title: 'Value',
      key: 'value',
      width: '10%',
      sorter: (a, b) => {
        const aVal = (a?.currentStock || 0) * (a?.avgRate || 0);
        const bVal = (b?.currentStock || 0) * (b?.avgRate || 0);
        return aVal - bVal;
      },
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
      sorter: (a, b) => {
        const aName = a?.supplier?.name || '';
        const bName = b?.supplier?.name || '';
        if (!aName && !bName) return 0;
        if (!aName) return 1;
        if (!bName) return -1;
        return aName.localeCompare(bName);
      },
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
      sorter: (a, b) => {
        const aProj = a?.referenceRequirement?.projectId?.name || '';
        const bProj = b?.referenceRequirement?.projectId?.name || '';
        if (!aProj && !bProj) return 0;
        if (!aProj) return 1;
        if (!bProj) return -1;
        return aProj.localeCompare(bProj);
      },
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
      sorter: (a, b) => {
        const aDate = a?.expiredDate;
        const bDate = b?.expiredDate;
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        const aDayjs = dayjs.isDayjs(aDate) ? aDate : dayjs(aDate);
        const bDayjs = dayjs.isDayjs(bDate) ? bDate : dayjs(bDate);
        return aDayjs.valueOf() - bDayjs.valueOf();
      },
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
      sorter: (a, b) => {
        const aNum = a?.number || 0;
        const bNum = b?.number || 0;
        return aNum - bNum;
      },
      render: (_, record) => {
        if (record?.number && record?.year) {
          return `PO-${record.year}-${String(record.number).padStart(4, '0')}`;
        }
        return '-';
      },
    },
  ];

  const recentTransactionColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => {
        if (!a?.date && !b?.date) return 0;
        if (!a?.date) return 1;
        if (!b?.date) return -1;
        return new Date(a.date) - new Date(b.date);
      },
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'IN' ? 'green' : 'red'} icon={type === 'IN' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>
          {type === 'IN' ? 'GRN' : 'Issue'}
        </Tag>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      sorter: (a, b) => {
        const aLen = a?.items?.length || 0;
        const bLen = b?.items?.length || 0;
        return aLen - bLen;
      },
      render: (_, record) => record?.items?.length || 0,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip title={text || ''}>
          {text || '-'}
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card 
        title="Inventory Dashboard" 
        style={{ marginBottom: 24 }}
        extra={
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={handleExportPDF}
            disabled={!projectId || inventoryData.length === 0}
          >
            Export PDF
          </Button>
        }
      >
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
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
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
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Pending Indents"
                    value={pendingIndents}
                    prefix={<WarningOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Critical Low Stock"
                    value={lowStockItems.length}
                    valueStyle={{ color: lowStockItems.length > 0 ? '#ff4d4f' : '#52c41a' }}
                    prefix={<WarningOutlined />}
                  />
                </Card>
              </Col>
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
            </Row>
            <Row gutter={16} style={{ marginBottom: 24 }}>
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
            </Row>
          </>
        )}
      </Card>

      {/* Recent Transactions */}
      {projectId && recentTransactions.length > 0 && (
        <Card title="Recent Transactions" style={{ marginBottom: 24 }}>
          <Table
            dataSource={recentTransactions}
            columns={recentTransactionColumns}
            rowKey={(record) => record?._id || Math.random()}
            pagination={false}
            size="small"
            locale={{ emptyText: 'No recent transactions' }}
          />
        </Card>
      )}

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
            rowKey={(record) => record?._id || Math.random()}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} pending shipments`,
            }}
            size="small"
            locale={{ emptyText: 'No pending shipments' }}
            loading={loadingShipments}
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
            rowKey={(record) => record?._id || record?.material?._id || Math.random()}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} materials`,
            }}
            locale={{ emptyText: 'No inventory data available' }}
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
