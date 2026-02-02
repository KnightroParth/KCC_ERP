import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Card, Row, Col, Select, DatePicker, Button, Tag, message,
  Popconfirm, Input, Tabs, Space, Empty, InputNumber, Modal
} from 'antd';
import {
  EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UserOutlined, TeamOutlined, SaveOutlined, PlusOutlined, ReloadOutlined, UserAddOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import request from '@/request/request';
import AttendanceModal from './AttendanceModal';
import { ErpLayout } from '@/layout';

const { Content } = Layout;
const { Option } = Select;

// ==========================================
// 1. Vendor Card (With Green Saved State)
// ==========================================
const VendorAttendanceCard = ({ vendor, existingRecord, onSave }) => {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [customTypes, setCustomTypes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // Load Data
  useEffect(() => {
    const initialCounts = {};
    const initialCustom = [];

    // If saved record exists, use those values
    if (existingRecord?.labourCounts) {
      existingRecord.labourCounts.forEach(item => {
        initialCounts[item.labourType] = item.count;
        // Check if custom type
        const isDefault = vendor.labourSupplyDetails?.some(d => d.labourType === item.labourType);
        if (!isDefault) initialCustom.push(item.labourType);
      });
    } else if (vendor.labourSupplyDetails) {
      // Use defaults
      vendor.labourSupplyDetails.forEach(item => {
        initialCounts[item.labourType] = 0;
      });
    }
    setCounts(initialCounts);
    setCustomTypes([...new Set(initialCustom)]);
  }, [vendor, existingRecord]);

  const handleSave = async () => {
    setLoading(true);
    const payload = Object.entries(counts)
      .filter(([_, qty]) => qty !== null && qty !== '')
      .map(([type, qty]) => ({ labourType: type, count: Number(qty) }));

    await onSave(vendor._id, payload);
    setLoading(false);
  };

  const addCustomType = () => {
    if (newTypeName) {
      setCustomTypes(prev => [...prev, newTypeName]);
      setCounts(prev => ({ ...prev, [newTypeName]: 0 }));
      setNewTypeName('');
      setIsModalOpen(false);
    }
  };

  const defaultTypes = vendor.labourSupplyDetails?.map(x => x.labourType) || [];
  const displayTypes = [...new Set([...defaultTypes, ...customTypes])];
  const isSaved = !!existingRecord;

  return (
    <Card
      size="small"
      style={{ 
        marginBottom: 12, 
        borderLeft: isSaved ? '5px solid #52c41a' : '5px solid #d9d9d9',
        boxShadow: isSaved ? '0 2px 8px rgba(82, 196, 26, 0.15)' : 'none'
      }}
      title={
        <Space>
          <TeamOutlined style={{ color: isSaved ? '#52c41a' : '#666' }} />
          <strong>{vendor.name}</strong>
          {isSaved && <Tag color="success">Saved</Tag>}
        </Space>
      }
    >
      <Row gutter={[16, 16]} align="middle">
        {displayTypes.map(type => (
          <Col key={type} span={6} xs={24} sm={12} md={8} lg={6}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: 2 }}>{type}</div>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              value={counts[type]}
              onChange={(val) => setCounts(prev => ({ ...prev, [type]: val }))}
            />
          </Col>
        ))}
        <Col span={24} style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 8 }}>
           <Button size="small" type="dashed" onClick={() => setIsModalOpen(true)} icon={<PlusOutlined />}>
            Add Type
          </Button>
          <Button 
            type={isSaved ? "default" : "primary"} 
            icon={<SaveOutlined />} 
            loading={loading} 
            onClick={handleSave}
            style={isSaved ? { borderColor: '#52c41a', color: '#52c41a' } : {}}
          >
            {isSaved ? "Update" : "Save"}
          </Button>
        </Col>
      </Row>
      <Modal title="Add Labour Type" open={isModalOpen} onOk={addCustomType} onCancel={() => setIsModalOpen(false)}>
        <Input placeholder="e.g. Carpenter" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} />
      </Modal>
    </Card>
  );
};

// ==========================================
// 2. Staff Row (With Edit/Delete/Mark Buttons)
// ==========================================
const LabourAttendanceRow = ({ labour, record, onMark, onEdit, onDelete }) => {
  const isMarked = !!record;
  const isAbsent = record?.status === 'Absent';
  
  return (
    <div style={{ 
      background: '#fff', padding: '12px', marginBottom: '8px', borderRadius: '6px',
      border: '1px solid #f0f0f0', borderLeft: isMarked ? (isAbsent ? '4px solid #ff4d4f' : '4px solid #52c41a') : '4px solid #d9d9d9',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      <Space>
        <UserOutlined style={{ fontSize: 16, color: '#1890ff' }} />
        <div>
          <div style={{ fontWeight: 600 }}>{labour.name}</div>
          <Space size={4}>
            <Tag style={{margin:0}}>{labour.trade}</Tag>
            {labour.labourType && <Tag color="blue" style={{margin:0}}>{labour.labourType}</Tag>}
          </Space>
        </div>
      </Space>

      <div>
        {isMarked ? (
          <Space>
            {isAbsent ? (
              <Tag color="red" icon={<CloseCircleOutlined />}>ABSENT</Tag>
            ) : (
              <Tag color="green" icon={<CheckCircleOutlined />}>Present: {(record.fullDay || 0) + (record.halfDay || 0)}</Tag>
            )}
            {/* BUTTONS RESTORED HERE */}
            <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>Edit</Button>
            <Popconfirm title="Delete this record?" onConfirm={() => onDelete(record._id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ) : (
          <Button type="primary" size="small" onClick={() => onMark(labour)}>
            Mark Attendance
          </Button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. Main Page
// ==========================================
export default function Attendance() {
  const navigate = useNavigate(); // Hook for navigation
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [activeTab, setActiveTab] = useState('staff');
  
  const [labours, setLabours] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [records, setRecords] = useState([]);
  const [searchText, setSearchText] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [currentLabour, setCurrentLabour] = useState(null);
  const [currentRecord, setCurrentRecord] = useState(null);

  // Initial Load
  useEffect(() => {
    request.listAll({ entity: 'project' }).then(res => {
      if(res.result) setProjects(res.result);
    });
  }, []);

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const recordRes = await request.list({ 
        entity: 'attendance', 
        options: { projectId: selectedProject._id, date: selectedDate.format('YYYY-MM-DD') } 
      });
      setRecords(recordRes.result || []);

      if (activeTab === 'staff') {
        const labourRes = await request.list({ entity: 'labour', options: { status: 'Active' } });
        setLabours(labourRes.result || []);
      } else {
        const vendorRes = await request.list({ entity: 'vendor', options: { enabled: true } });
        setVendors(vendorRes.result || []);
      }
    } catch (e) {
      message.error("Failed to load data");
    }
  }, [selectedProject, selectedDate, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Actions
  const handleVendorSave = async (vendorId, labourCounts) => {
    const res = await request.post({
      entity: 'attendance/mark',
      jsonData: {
        projectId: selectedProject._id,
        date: selectedDate.format('YYYY-MM-DD'),
        vendorId,
        labourCounts
      }
    });
    if (res.success) {
      message.success('Contractor Attendance Saved');
      fetchData();
    } else {
      message.error(res.message || 'Error saving');
    }
  };

  const handleDelete = async (id) => {
    const res = await request.delete({ entity: 'attendance', id });
    if (res.success) {
      message.success('Deleted');
      fetchData();
    }
  };

  const getRecord = (labourId) => records.find(r => r.labourId && (r.labourId._id === labourId || r.labourId === labourId));
  const getVendorRecord = (vendorId) => records.find(r => r.vendorId && (r.vendorId._id === vendorId || r.vendorId === vendorId));

  return (
    <ErpLayout>
      <Layout style={{ minHeight: 'auto', background: 'transparent' }}>
        <Content style={{ padding: '32px 24px' }}>
          <div className="page-content-inner">
            {/* Page title - same pattern as Work in Progress / Billing */}
            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 className="page-title">Mark Attendance</h1>
                <p style={{ color: '#8c8c8c', marginBottom: 0 }}>Record staff and contractor attendance by project and date</p>
              </div>
              <Space>
                <Button icon={<UserAddOutlined />} onClick={() => navigate('/labour')}>
                  Manage Staff
                </Button>
                <Button icon={<TeamOutlined />} onClick={() => navigate('/vendor')}>
                  Manage Contractor
                </Button>
              </Space>
            </div>

            {/* Filters - same card style as other modules */}
            <Card bodyStyle={{ padding: '16px' }} style={{ marginBottom: 24 }} bordered={false}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Select
                    placeholder="Select Project"
                    style={{ width: '100%' }}
                    size="large"
                    value={selectedProject?._id}
                    onChange={(val) => setSelectedProject(projects.find(p => p._id === val))}
                  >
                    {projects.map(p => <Option key={p._id} value={p._id}>{p.name}</Option>)}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <DatePicker
                    style={{ width: '100%' }}
                    size="large"
                    value={selectedDate}
                    onChange={(d) => setSelectedDate(d)}
                    allowClear={false}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData} size="large" block>
                    Refresh Data
                  </Button>
                </Col>
              </Row>
            </Card>

            {/* Tabs content */}
            {!selectedProject ? (
              <Card bordered={false}>
                <Empty description="Select a Project to start" />
              </Card>
            ) : (
              <Card bordered={false} bodyStyle={{ padding: '0 24px 24px' }}>
                <Tabs
                  type="card"
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  items={[
                    {
                      label: 'Company Staff',
                      key: 'staff',
                      children: (
                        <div style={{ paddingTop: 16 }}>
                          <Input
                            placeholder="Search Staff Name..."
                            style={{ marginBottom: 16, maxWidth: 300 }}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                          />
                          {labours
                            .filter(l => l.name.toLowerCase().includes(searchText.toLowerCase()))
                            .map(labour => (
                              <LabourAttendanceRow
                                key={labour._id}
                                labour={labour}
                                record={getRecord(labour._id)}
                                onMark={() => { setCurrentLabour(labour); setCurrentRecord(null); setModalVisible(true); }}
                                onEdit={(rec) => { setCurrentLabour(labour); setCurrentRecord(rec); setModalVisible(true); }}
                                onDelete={handleDelete}
                              />
                            ))}
                          {labours.length === 0 && <Empty description="No staff found" />}
                        </div>
                      ),
                    },
                    {
                      label: 'Contractor Labour',
                      key: 'vendor',
                      children: (
                        <div style={{ paddingTop: 16 }}>
                          {vendors.map(vendor => (
                            <VendorAttendanceCard
                              key={vendor._id}
                              vendor={vendor}
                              existingRecord={getVendorRecord(vendor._id)}
                              onSave={handleVendorSave}
                            />
                          ))}
                          {vendors.length === 0 && <Empty description="No contractors found" />}
                        </div>
                      ),
                    },
                  ]}
                />
              </Card>
            )}
          </div>
        </Content>
      </Layout>

      <AttendanceModal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        labour={currentLabour}
        existingRecord={currentRecord}
        projectId={selectedProject?._id}
        date={selectedDate}
        onSuccess={() => { setModalVisible(false); fetchData(); }}
      />
    </ErpLayout>
  );
}