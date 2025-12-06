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
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  UserOutlined,
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
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [vendorFilter, setVendorFilter] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLabour, setSelectedLabour] = useState(null);
  const [existingRecord, setExistingRecord] = useState(null);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch labours when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchLabours();
    } else {
      setLabours([]);
      setAttendanceRecords([]);
    }
  }, [selectedProject]);

  // Fetch attendance records when filters change
  useEffect(() => {
    if (selectedProject && selectedDate) {
      fetchAttendanceRecords();
    }
  }, [selectedProject, selectedDate, vendorFilter, searchText]);

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
      // Changed options structure to match what request.list expects
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
         // Fallback if result is directly the array
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

  const handleMarkAttendance = (labour) => {
    // Check if record already exists for this labour and date
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

  // Get labours that don't have attendance records for the selected date
  const getUnmarkedLabours = () => {
    const markedLabourIds = new Set(
      attendanceRecords
        .filter((r) => r.labourId)
        .map((r) => r.labourId._id)
    );

    let filtered = labours.filter((labour) => !markedLabourIds.has(labour._id));

    // Apply vendor filter
    if (vendorFilter !== 'All') {
      filtered = filtered.filter((labour) => labour.vendorType === vendorFilter);
    }

    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (labour) =>
          labour.name?.toLowerCase().includes(searchLower) ||
          labour.trade?.toLowerCase().includes(searchLower) ||
          labour.labourType?.toLowerCase().includes(searchLower) ||
          labour.vendorType?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  // Get marked labours
  const getMarkedLabours = () => {
    let marked = attendanceRecords
      .filter((r) => r.labourId)
      .map((r) => ({
        labour: r.labourId,
        record: r,
      }));

    // Apply vendor filter
    if (vendorFilter !== 'All') {
      marked = marked.filter((item) => item.labour.vendorType === vendorFilter);
    }

    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      marked = marked.filter(
        (item) =>
          item.labour.name?.toLowerCase().includes(searchLower) ||
          item.labour.trade?.toLowerCase().includes(searchLower) ||
          item.labour.labourType?.toLowerCase().includes(searchLower) ||
          item.labour.vendorType?.toLowerCase().includes(searchLower)
      );
    }

    return marked;
  };

  const unmarkedLabours = getUnmarkedLabours();
  const markedLabours = getMarkedLabours();

  const renderLabourCard = (labour, record = null) => {
    const isMarked = !!record;
    const totalDays = record ? (record.fullDay || 0) + (record.halfDay || 0) : 0;

    return (
      <Card
        key={labour._id}
        size="small"
        style={{
          marginBottom: 12,
          borderRadius: 8,
          border: isMarked ? '1px solid #52c41a' : '1px solid #d9d9d9',
        }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Row gutter={[8, 8]} align="middle">
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
                <Tag size="small" color={labour.vendorType === 'My Labour' ? 'green' : 'orange'}>
                  {labour.vendorType}
                </Tag>
              </div>
              {isMarked && (
                <div style={{ fontSize: 12, color: '#52c41a' }}>
                  <CheckCircleOutlined style={{ marginRight: 4 }} />
                  Full Day: {record.fullDay || 0} | Half Day: {record.halfDay || 0} | Total: {totalDays}
                </div>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type={isMarked ? 'default' : 'primary'}
                size="small"
                icon={isMarked ? <EditOutlined /> : <CheckCircleOutlined />}
                onClick={() => (isMarked ? handleEdit(record) : handleMarkAttendance(labour))}
              >
                {isMarked ? 'Edit' : 'Mark'}
              </Button>
              {isMarked && (
                <Popconfirm
                  title="Delete this attendance record?"
                  onConfirm={() => handleDelete(record)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <Layout style={{ padding: '24px', minHeight: '100vh', background: '#f0f2f5' }}>
      <Content>
        <Title level={2} style={{ marginBottom: 24 }}>
          Attendance Management
        </Title>

        {/* Filters */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={6}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Project</label>
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
            </Col>
            <Col span={6}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Date</label>
              <DatePicker
                style={{ width: '100%' }}
                format={dateFormat}
                value={selectedDate}
                onChange={(date) => setSelectedDate(date || dayjs())}
                size="large"
              />
            </Col>
            <Col span={6}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Vendor</label>
              <Tabs
                activeKey={vendorFilter}
                onChange={setVendorFilter}
                size="small"
                items={[
                  { key: 'All', label: 'All' },
                  { key: 'Vendor Labour', label: 'Vendor Labour' },
                  { key: 'My Labour', label: 'My Labour' },
                ]}
              />
            </Col>
            <Col span={6}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Search</label>
              <Search
                placeholder="Search by name, trade..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="large"
              />
            </Col>
          </Row>
        </Card>

        {selectedProject ? (
          <Row gutter={24}>
            {/* Left: Unmarked Labour */}
            <Col span={12}>
              <Card
                title={
                  <span>
                    Unmarked Labour <Tag color="default">{unmarkedLabours.length}</Tag>
                  </span>
                }
                style={{ height: 'calc(100vh - 280px)', overflowY: 'auto' }}
              >
                {unmarkedLabours.length > 0 ? (
                  unmarkedLabours.map((labour) => renderLabourCard(labour))
                ) : (
                  <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
                    No unmarked labours
                  </div>
                )}
              </Card>
            </Col>

            {/* Right: Marked Attendance */}
            <Col span={12}>
              <Card
                title={
                  <span>
                    Marked Attendance <Tag color="success">{markedLabours.length}</Tag>
                  </span>
                }
                style={{ height: 'calc(100vh - 280px)', overflowY: 'auto' }}
              >
                {markedLabours.length > 0 ? (
                  markedLabours.map(({ labour, record }) => renderLabourCard(labour, record))
                ) : (
                  <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
                    No marked attendance
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        ) : (
          <Card>
            <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
              Please select a project to view and mark attendance
            </div>
          </Card>
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
      </Content>
    </Layout>
  );
}
