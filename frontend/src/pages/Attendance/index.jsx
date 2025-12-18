// frontend/src/pages/Attendance/index.jsx

import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Button,
  Tag,
  message,
  Popconfirm,
  Input,
  Tabs,
  Space,
  Typography,
  Empty,
  Statistic,
  Divider,
  Table,
  InputNumber,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  TeamOutlined,
  SaveOutlined,
  PlusOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useLanguage from '@/locale/useLanguage';
import { useDate } from '@/settings';
import request from '@/request/request';
import AttendanceModal from './AttendanceModal';

const { Content } = Layout;
const { Option } = Select;
const { Search } = Input;
const { Title } = Typography;

export default function Attendance() {
  const translate = useLanguage();
  const { dateFormat } = useDate();

  const [projects, setProjects] = useState([]);
  const [labours, setLabours] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorAttendanceRecords, setVendorAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLabour, setSelectedLabour] = useState(null);
  const [existingRecord, setExistingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('company-staff');
  const [vendorCounts, setVendorCounts] = useState({}); // { vendorId: { labourType: count } }

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch labours when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchLabours();
      if (activeTab === 'vendor-labour') {
        fetchVendors();
        fetchVendorAttendance();
      }
    } else {
      setLabours([]);
      setAttendanceRecords([]);
      setVendors([]);
      setVendorAttendanceRecords([]);
    }
  }, [selectedProject, activeTab]);

  // Fetch attendance records when filters change
  useEffect(() => {
    if (selectedProject && selectedDate && activeTab === 'company-staff') {
      fetchAttendanceRecords();
    } else if (selectedProject && selectedDate && activeTab === 'vendor-labour') {
      fetchVendorAttendance();
    }
  }, [selectedProject, selectedDate, searchText, activeTab]);

  const fetchProjects = async () => {
    try {
      const response = await request.listAll({ entity: 'project' });
      if (response?.result) {
        setProjects(response.result);
      }
    } catch (error) {
      message.error('Failed to fetch projects');
    }
  };

  const fetchLabours = async () => {
    if (!selectedProject) return;
    try {
      const response = await request.list({
        entity: 'labour',
        options: {
          projectId: selectedProject._id,
          status: 'Active',
        },
      });
      if (response?.success && response?.result) {
        setLabours(response.result);
      } else {
        setLabours(response?.result || []);
      }
    } catch (error) {
      console.error('Failed to fetch labours:', error);
      message.error('Failed to fetch labours');
    }
  };

  const fetchAttendanceRecords = async () => {
    if (!selectedProject || !selectedDate) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        projectId: selectedProject._id,
        date: selectedDate.format('YYYY-MM-DD'),
        attendanceType: 'Individual',
      });

      if (searchText) {
        params.append('search', searchText);
      }

      const response = await request.get({
        entity: `attendance/list?${params.toString()}`,
      });

      if (response?.success && response?.result) {
        setAttendanceRecords(response.result);
      }
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
      message.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    if (!selectedProject) return;
    try {
      const response = await request.list({ entity: 'vendor', options: { enabled: true } });
      if (response?.success && response?.result) {
        setVendors(response.result);
      } else {
        setVendors(response?.result || []);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      message.error('Failed to fetch vendors');
    }
  };

  const fetchVendorAttendance = async () => {
    if (!selectedProject || !selectedDate) return;

    setVendorLoading(true);
    try {
      const params = new URLSearchParams({
        projectId: selectedProject._id,
        date: selectedDate.format('YYYY-MM-DD'),
        attendanceType: 'Group',
      });

      const response = await request.get({
        entity: `attendance/list?${params.toString()}`,
      });

      if (response?.success && response?.result) {
        setVendorAttendanceRecords(response.result);
        // Initialize vendorCounts from existing records
        const counts = {};
        response.result.forEach((record) => {
          if (record.vendorId && record.labourCounts) {
            counts[record.vendorId._id] = {};
            record.labourCounts.forEach((item) => {
              counts[record.vendorId._id][item.labourType] = item.count;
            });
          }
        });
        setVendorCounts(counts);
      }
    } catch (error) {
      console.error('Failed to fetch vendor attendance:', error);
      message.error('Failed to fetch vendor attendance');
    } finally {
      setVendorLoading(false);
    }
  };

  const handleMarkAttendance = (labour) => {
    const existing = attendanceRecords.find(
      (record) =>
        record.labourId &&
        record.labourId._id === labour._id &&
        dayjs(record.date).format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD')
    );

    setSelectedLabour(labour);
    setExistingRecord(existing || null);
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    if (record.labourId) {
      setSelectedLabour(record.labourId);
      setExistingRecord(record);
      setModalVisible(true);
    }
  };

  const handleDelete = async (record) => {
    try {
      const response = await request.delete({
        entity: 'attendancerecord',
        id: record._id,
      });

      if (response?.success) {
        message.success('Attendance record deleted successfully');
        fetchAttendanceRecords();
      }
    } catch (error) {
      message.error('Failed to delete attendance record');
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setSelectedLabour(null);
    setExistingRecord(null);
    fetchAttendanceRecords();
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setSelectedLabour(null);
    setExistingRecord(null);
  };

  const handleVendorCountChange = (vendorId, labourType, count) => {
    setVendorCounts((prev) => {
      const newCounts = { ...prev };
      if (!newCounts[vendorId]) {
        newCounts[vendorId] = {};
      }
      if (count === null || count === undefined || count === '') {
        delete newCounts[vendorId][labourType];
        if (Object.keys(newCounts[vendorId]).length === 0) {
          delete newCounts[vendorId];
        }
      } else {
        newCounts[vendorId][labourType] = count;
      }
      return newCounts;
    });
  };

  const handleAddVendorLabourType = (vendorId, labourType) => {
    setVendorCounts((prev) => {
      const newCounts = { ...prev };
      if (!newCounts[vendorId]) {
        newCounts[vendorId] = {};
      }
      newCounts[vendorId][labourType] = 0;
      return newCounts;
    });
  };

  const handleSaveVendorAttendance = async (vendor) => {
    if (!selectedProject || !selectedDate) {
      message.error('Please select project and date');
      return;
    }

    const counts = vendorCounts[vendor._id] || {};
    const labourCounts = Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([labourType, count]) => ({ labourType, count }));

    if (labourCounts.length === 0) {
      message.error('Please enter at least one labour count');
      return;
    }

    try {
      const response = await request.post({
        entity: 'attendance/mark',
        jsonData: {
          projectId: selectedProject._id,
          vendorId: vendor._id,
          date: selectedDate.format('YYYY-MM-DD'),
          labourCounts,
        },
      });

      if (response?.success) {
        message.success('Vendor attendance saved successfully');
        fetchVendorAttendance();
      } else {
        message.error(response?.message || 'Failed to save vendor attendance');
      }
    } catch (error) {
      message.error(error.message || 'Failed to save vendor attendance');
    }
  };

  // Get stats for Company Staff
  const getStats = () => {
    const totalLabours = labours.length;

    const presentCount = attendanceRecords.filter(
      (r) => r.attendanceType === 'Individual' && r.status === 'Present' && r.labourId
    ).length;

    const absentCount = attendanceRecords.filter(
      (r) => r.attendanceType === 'Individual' && r.status === 'Absent' && r.labourId
    ).length;

    const halfDays = attendanceRecords
      .filter((r) => r.attendanceType === 'Individual' && r.status === 'Present' && r.labourId)
      .reduce((sum, r) => sum + (r.halfDay || 0), 0);

    return {
      totalLabours,
      present: presentCount,
      absent: absentCount,
      halfDays: halfDays.toFixed(1),
    };
  };

  // Get labours with their attendance records
  const getLaboursWithRecords = () => {
    const recordMap = new Map();
    attendanceRecords
      .filter((r) => r.attendanceType === 'Individual' && r.labourId)
      .forEach((record) => {
        recordMap.set(record.labourId._id, record);
      });

    let allLabours = labours.map((labour) => ({
      labour,
      record: recordMap.get(labour._id) || null,
    }));

    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      allLabours = allLabours.filter(
        (item) =>
          item.labour.name?.toLowerCase().includes(searchLower) ||
          item.labour.trade?.toLowerCase().includes(searchLower) ||
          item.labour.labourType?.toLowerCase().includes(searchLower)
      );
    }

    return allLabours;
  };

  const stats = getStats();
  const laboursWithRecords = getLaboursWithRecords();

  const renderLabourRow = (item) => {
    const { labour, record } = item;
    const isMarked = !!record;
    const status = record?.status || 'Present';
    const isAbsent = status === 'Absent';
    const totalDays = record ? (record.fullDay || 0) + (record.halfDay || 0) : 0;

    const statusColor = isAbsent ? '#ff4d4f' : '#52c41a';
    const StatusIcon = isAbsent ? CloseCircleOutlined : CheckCircleOutlined;

    return (
      <Card
        key={labour._id}
        size="small"
        style={{
          marginBottom: 8,
          borderRadius: 8,
          border: '1px solid #d9d9d9',
        }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Row gutter={[16, 8]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <div>
                <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                <strong style={{ fontSize: 15 }}>{labour.name}</strong>
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                <Tag size="small" color="blue">
                  {labour.trade}
                </Tag>
                <Tag size="small" color="purple">
                  {labour.labourType}
                </Tag>
              </div>
            </Space>
          </Col>
          <Col>
            {isMarked ? (
              <Space>
                <div style={{ fontSize: 13, color: statusColor, fontWeight: 500 }}>
                  <StatusIcon style={{ marginRight: 4 }} />
                  {isAbsent ? (
                    'ABSENT'
                  ) : (
                    `Full Day: ${record.fullDay || 0} | Half Day: ${record.halfDay || 0} | Total: ${totalDays}`
                  )}
                </div>
                <Button
                  type="default"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                >
                  Edit
                </Button>
                <Popconfirm
                  title="Delete this attendance record?"
                  onConfirm={() => handleDelete(record)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ) : (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleMarkAttendance(labour)}
              >
                Mark
              </Button>
            )}
          </Col>
        </Row>
      </Card>
    );
  };

  const renderVendorRow = (vendor) => {
    const existingRecord = vendorAttendanceRecords.find(
      (r) => r.vendorId && r.vendorId._id === vendor._id
    );

    const vendorCountsData = vendorCounts[vendor._id] || {};
    const labourSupplyDetails = vendor.labourSupplyDetails || [];

    // Get all unique labour types (from vendor defaults + user-added)
    const allLabourTypes = new Set([
      ...labourSupplyDetails.map((item) => item.labourType),
      ...Object.keys(vendorCountsData),
    ]);

    return (
      <Card
        key={vendor._id}
        size="small"
        style={{
          marginBottom: 16,
          borderRadius: 8,
          border: existingRecord ? '1px solid #52c41a' : '1px solid #d9d9d9',
        }}
        bodyStyle={{ padding: '16px' }}
      >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Space>
              <TeamOutlined style={{ color: '#1890ff' }} />
              <strong style={{ fontSize: 15 }}>{vendor.name}</strong>
              {existingRecord && (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  Saved
                </Tag>
              )}
            </Space>
          </Col>
          <Col span={24}>
            <Row gutter={[16, 8]}>
              {Array.from(allLabourTypes).map((labourType) => {
                const defaultDetail = labourSupplyDetails.find((d) => d.labourType === labourType);
                const currentCount = vendorCountsData[labourType] ?? (existingRecord?.labourCounts?.find((lc) => lc.labourType === labourType)?.count ?? 0);

                return (
                  <Col key={labourType} xs={24} sm={12} md={8} lg={6}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <div style={{ fontSize: 12, color: '#666' }}>{labourType}</div>
                      <InputNumber
                        placeholder="Count"
                        min={0}
                        value={currentCount}
                        onChange={(value) => handleVendorCountChange(vendor._id, labourType, value)}
                        style={{ width: '100%' }}
                      />
                    </Space>
                  </Col>
                );
              })}
              <Col xs={24} sm={12} md={8} lg={6}>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    const newType = prompt('Enter labour type:');
                    if (newType && newType.trim()) {
                      handleAddVendorLabourType(vendor._id, newType.trim());
                    }
                  }}
                  style={{ width: '100%', height: '32px' }}
                >
                  Add Type
                </Button>
              </Col>
            </Row>
          </Col>
          <Col span={24}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => handleSaveVendorAttendance(vendor)}
              loading={vendorLoading}
            >
              Save Attendance
            </Button>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderCompanyStaffTab = () => {
    return (
      <>
        {/* Stats Cards */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Staff"
                value={stats.totalLabours}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Present"
                value={stats.present}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Absent"
                value={stats.absent}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Half Days"
                value={stats.halfDays}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Labours List */}
        {laboursWithRecords.length > 0 ? (
          <div className="card-section" style={{ minHeight: 400 }}>
            <div style={{ maxHeight: 'calc(100vh - 500px)', overflowY: 'auto' }}>
              {laboursWithRecords.map((item) => renderLabourRow(item))}
            </div>
          </div>
        ) : (
          <div className="card-section" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Empty description="No staff found" />
          </div>
        )}
      </>
    );
  };

  const renderVendorLabourTab = () => {
    return (
      <>
        {vendors.length > 0 ? (
          <div className="card-section" style={{ minHeight: 400 }}>
            {vendors.map((vendor) => renderVendorRow(vendor))}
          </div>
        ) : (
          <div className="card-section" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Empty description="No vendors found. Please add vendors in Vendor Master." />
          </div>
        )}
      </>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>
      <Content style={{ padding: '32px 24px' }}>
        <div className="page-content-inner">
          <div style={{ marginBottom: 32 }}>
            <h1 className="page-title">Attendance Management</h1>
            <p style={{ color: '#8c8c8c', marginBottom: 0 }}>Track and manage attendance records</p>
          </div>

          {/* Filters */}
          <div className="filter-bar">
            <div className="filter-bar-item" style={{ flex: 1, minWidth: 220 }}>
              <label className="filter-bar-label">Project</label>
              <Select
                placeholder="Select Project"
                style={{ width: '100%' }}
                value={selectedProject?._id}
                onChange={(value) => {
                  const project = projects.find((p) => p._id === value);
                  setSelectedProject(project);
                }}
                size="large"
              >
                {projects.map((project) => (
                  <Option key={project._id} value={project._id}>
                    {project.name} ({project.projectCode})
                  </Option>
                ))}
              </Select>
            </div>
            <div className="filter-bar-item" style={{ flex: 1, minWidth: 220 }}>
              <label className="filter-bar-label">Date</label>
              <DatePicker
                style={{ width: '100%' }}
                format={dateFormat}
                value={selectedDate}
                onChange={(date) => setSelectedDate(date || dayjs())}
                size="large"
              />
            </div>
            {activeTab === 'company-staff' && (
              <div className="filter-bar-item" style={{ flex: 1.2, minWidth: 220 }}>
                <label className="filter-bar-label">Search</label>
                <Search
                  placeholder="Search by name, trade..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  size="large"
                />
              </div>
            )}
          </div>

          {selectedProject ? (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              style={{ marginTop: 24 }}
              items={[
                {
                  key: 'company-staff',
                  label: (
                    <span>
                      <UserOutlined />
                      Company Staff
                    </span>
                  ),
                  children: renderCompanyStaffTab(),
                },
                {
                  key: 'vendor-labour',
                  label: (
                    <span>
                      <TeamOutlined />
                      Vendor Labour
                    </span>
                  ),
                  children: renderVendorLabourTab(),
                },
              ]}
            />
          ) : (
            <div className="card-section" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <Empty description="Please select a project to view and mark attendance" />
            </div>
          )}

          <AttendanceModal
            open={modalVisible}
            onCancel={handleModalCancel}
            onSuccess={handleModalSuccess}
            labour={selectedLabour}
            projectId={selectedProject?._id}
            date={selectedDate}
            existingRecord={existingRecord}
          />
        </div>
      </Content>
    </Layout>
  );
}
