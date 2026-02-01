import React, { useState, useEffect } from 'react';
import { Layout, Select, Card, Empty, Table, Tag, message, Button, Modal, Space, Form } from 'antd';
import { DeleteOutlined, CameraOutlined } from '@ant-design/icons';
import request from '@/request/request';
import { WORK_CATEGORIES, COMPLEX_TASK_COMPONENTS } from '@/config/workConfig';
import ImageUpload from '@/components/ImageUpload';

// Import Complex Forms for checklists
import SlabReinforcementForm from '@/pages/work/planning/components/SlabReinforcementForm';
import MivanCenteringForm from '@/pages/work/planning/components/MivanCenteringForm';
import ElectricalWorkIForm from '@/pages/work/planning/components/ElectricalWorkIForm';
import ElectricalWorkEForm from '@/pages/work/planning/components/ElectricalWorkEForm';
import PlumbingForm from '@/pages/work/planning/components/PlumbingForm';
import TilesForm from '@/pages/work/planning/components/TilesForm';

// Component Mapping for checklists
const FORM_COMPONENTS = {
    'SlabReinforcementForm': SlabReinforcementForm,
    'MivanCenteringForm': MivanCenteringForm,
    'ElectricalWorkIForm': ElectricalWorkIForm,
    'ElectricalWorkEForm': ElectricalWorkEForm,
    'PlumbingForm': PlumbingForm,
    'TilesForm': TilesForm,
};

const { Content } = Layout;
const { Option } = Select;

export default function WorkInProgress() {
    const [projects, setProjects] = useState([]);
    const [unitsList, setUnitsList] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [progressData, setProgressData] = useState({});

    // Photo and checklist states
    const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
    const [currentActivity, setCurrentActivity] = useState(null);
    const [checklistData, setChecklistData] = useState({});
    const [photoBefore, setPhotoBefore] = useState(null);
    const [photoAfter, setPhotoAfter] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [modalMode, setModalMode] = useState(null); // 'photo' or 'checklist'
    const [form] = Form.useForm();

    useEffect(() => {
        const fetchInitialData = async () => {
            const projectResult = await request.listAll({ entity: 'project' });
            if (projectResult.success) setProjects(projectResult.result);

            const unitsResult = await request.listAll({ entity: 'units' });
            if (unitsResult.success) setUnitsList(unitsResult.result);
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedProject) {
            // Find the selected project object to get its projectCode
            const projectObj = projects.find(p => p._id === selectedProject);
            const targetCode = projectObj?.projectCode || projectObj?.projectId;

            const projectUnits = unitsList.filter(u => {
                const unitProjectId = u.projectId?._id || u.projectId;
                // Units use projectCode/code as projectId string
                return unitProjectId === targetCode || unitProjectId === selectedProject;
            });

            const uniqueBuildings = [...new Set(projectUnits.map(u => u.buildingName || u.towerOrWing).filter(Boolean))].sort();
            setBuildings(uniqueBuildings);
        } else {
            setBuildings([]);
        }
        setSelectedBuilding(null);
    }, [selectedProject, unitsList, projects]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await request.listAll({ entity: 'activities' });
                if (res.success) {
                    let filtered = res.result || [];
                    if (selectedProject) filtered = filtered.filter(a => (a.projectId?._id || a.projectId) === selectedProject);
                    if (selectedBuilding) {
                        filtered = filtered.filter(a => {
                            const unit = unitsList.find(u => u._id === (a.unitId?._id || a.unitId));
                            return (unit?.buildingName || unit?.towerOrWing) === selectedBuilding;
                        });
                    }
                    if (selectedCategory) filtered = filtered.filter(a => a.category === selectedCategory);
                    setData(filtered);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedProject, selectedBuilding, selectedCategory, unitsList]);

    const handleProgressChange = async (activityId, value) => {
        try {
            // Determine status based on progress
            let status = 'In Progress';
            if (value === '0%') {
                status = 'Pending';
            } else if (value === '100%') {
                status = 'Completed';
            }

            // Update local state
            setProgressData(prev => ({ ...prev, [activityId]: value }));

            // Update backend with both progress and status
            const activity = data.find(a => a._id === activityId);
            if (activity) {
                // Check if this activity has a detailed checklist
                const hasChecklist = COMPLEX_TASK_COMPONENTS[activity.activityName];

                // If progress is 100% and has checklist, show modal
                if (value === '100%') {
                    if (hasChecklist) {
                        setCurrentActivity({ ...activity, progress: value });
                        setChecklistData(activity.data || {});
                        setModalMode('checklist');
                        setIsChecklistModalOpen(true);
                        return;
                    }
                }

                // Update activity progress
                await request.update({
                    entity: 'activities',
                    id: activityId,
                    jsonData: { ...activity, progress: value, status }
                });

                // Calculate and update unit grade
                await updateUnitGrade(activity.unitId, value);
                message.success(`Progress updated to ${value} - Status: ${status}`);

                // Refresh data to get updated status
                const res = await request.listAll({ entity: 'activities' });
                if (res.success) {
                    let filtered = res.result || [];
                    if (selectedProject) filtered = filtered.filter(a => (a.projectId?._id || a.projectId) === selectedProject);
                    if (selectedBuilding) {
                        filtered = filtered.filter(a => {
                            const unit = unitsList.find(u => u._id === (a.unitId?._id || a.unitId));
                            return (unit?.buildingName || unit?.towerOrWing) === selectedBuilding;
                        });
                    }
                    if (selectedCategory) filtered = filtered.filter(a => a.category === selectedCategory);
                    setData(filtered);
                }
            }
        } catch (error) {
            message.error('Failed to update progress');
            console.error(error);
        }
    };

    // Function to calculate and update unit grade based on progress
    const updateUnitGrade = async (unitId, progress) => {
        try {
            // Extract unit ID if it's an object
            const actualUnitId = typeof unitId === 'object' ? unitId._id : unitId;

            if (!actualUnitId) {
                console.warn('No unit ID available for grade update');
                return;
            }

            // Calculate grade based on progress
            let grade = 'A';
            switch (progress) {
                case '0%':
                    grade = 'A';
                    break;
                case '25%':
                    grade = 'A+';
                    break;
                case '50%':
                    grade = 'A++';
                    break;
                case '75%':
                    grade = 'A+++';
                    break;
                case '100%':
                    grade = 'Ready';
                    break;
                default:
                    grade = 'A';
            }

            // Update unit with new grade
            await request.update({
                entity: 'units',
                id: actualUnitId,
                jsonData: { grade }
            });

            console.log(`Unit ${actualUnitId} grade updated to ${grade}`);
        } catch (error) {
            console.error('Error updating unit grade:', error);
            // Don't show error to user as this is a background operation
        }
    };

    const getProgressColor = (progress) => {
        const colors = {
            '0%': '#ff4d4f',    // Red
            '25%': '#ffa940',   // Orange (transition)
            '50%': '#fadb14',   // Yellow
            '75%': '#95de64',   // Light green (transition)
            '100%': '#52c41a'   // Green
        };
        return colors[progress] || '#d9d9d9';
    };

    const handleDelete = async (activityId) => {
        try {
            const result = await request.delete({ entity: 'activities', id: activityId });
            if (result.success) {
                message.success('Activity deleted successfully');
                // Refresh the data
                setData(prev => prev.filter(item => item._id !== activityId));
            } else {
                message.error('Failed to delete activity');
            }
        } catch (error) {
            message.error('An error occurred while deleting');
            console.error(error);
        }
    };

    const getStatusConfig = (progress) => {
        if (progress === '0%') {
            return { text: 'Pending', color: 'default' };
        } else if (progress === '100%') {
            return { text: 'Completed', color: 'success' };
        } else {
            return { text: 'In Progress', color: 'orange' };
        }
    };

    const columns = [
        {
            title: 'Building', key: 'building',
            render: (_, record) => {
                const unit = unitsList.find(u => u._id === (record.unitId?._id || record.unitId));
                return unit?.buildingName || unit?.towerOrWing || '-';
            },
            sorter: (a, b) => {
                const uA = unitsList.find(u => u._id === (a.unitId?._id || a.unitId));
                const uB = unitsList.find(u => u._id === (b.unitId?._id || b.unitId));
                return (uA?.buildingName || '').localeCompare(uB?.buildingName || '');
            }
        },
        {
            title: 'Floor', key: 'floor',
            render: (_, record) => {
                const unit = unitsList.find(u => u._id === (record.unitId?._id || record.unitId));
                return unit?.floor || unit?.floorNumber || '-';
            },
            sorter: (a, b) => {
                const uA = unitsList.find(u => u._id === (a.unitId?._id || a.unitId));
                const uB = unitsList.find(u => u._id === (b.unitId?._id || b.unitId));
                return (uA?.floor || '').localeCompare(uB?.floor || '', undefined, { numeric: true });
            }
        },
        {
            title: 'Unit', key: 'unit',
            render: (_, record) => {
                const unit = unitsList.find(u => u._id === (record.unitId?._id || record.unitId));
                return unit?.unitNumber || '-';
            },
            sorter: (a, b) => {
                const uA = unitsList.find(u => u._id === (a.unitId?._id || a.unitId));
                const uB = unitsList.find(u => u._id === (b.unitId?._id || b.unitId));
                return (uA?.unitNumber || '').localeCompare(uB?.unitNumber || '', undefined, { numeric: true });
            }
        },
        {
            title: 'Work Type',
            dataIndex: 'category',
            key: 'category',
            render: (text) => <Tag color="blue">{text}</Tag>,
            sorter: (a, b) => (a.category || '').localeCompare(b.category || '')
        },
        {
            title: 'Activity',
            dataIndex: 'activityName',
            key: 'activity',
            sorter: (a, b) => (a.activityName || '').localeCompare(b.activityName || '')
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => {
                const currentProgress = progressData[record._id] || record.progress || '0%';
                const statusConfig = getStatusConfig(currentProgress);
                return <Tag color={statusConfig.color}>{statusConfig.text}</Tag>;
            },
            sorter: (a, b) => {
                const pA = progressData[a._id] || a.progress || '0%';
                const pB = progressData[b._id] || b.progress || '0%';
                return parseInt(pA) - parseInt(pB);
            }
        },
        {
            title: 'Progress (%)',
            key: 'progress',
            width: 150,
            sorter: (a, b) => {
                const pA = progressData[a._id] || a.progress || '0%';
                const pB = progressData[b._id] || b.progress || '0%';
                return parseInt(pA) - parseInt(pB);
            },
            render: (_, record) => {
                const currentProgress = progressData[record._id] || record.progress || '0%';
                const isCompleted = currentProgress === '100%';
                const color = getProgressColor(currentProgress);

                return (

                    <Select
                        value={currentProgress}
                        onChange={(value) => handleProgressChange(record._id, value)}
                        disabled={isCompleted}
                        style={{
                            width: '100%',
                            borderColor: color,
                            color: color,
                            fontWeight: 'bold'
                        }}
                        size="small"
                        className="progress-select"
                    >
                        <Option value="0%"><span style={{ color: getProgressColor('0%'), fontWeight: 'bold' }}>0%</span></Option>
                        <Option value="25%"><span style={{ color: getProgressColor('25%'), fontWeight: 'bold' }}>25%</span></Option>
                        <Option value="50%"><span style={{ color: getProgressColor('50%'), fontWeight: 'bold' }}>50%</span></Option>
                        <Option value="75%"><span style={{ color: getProgressColor('75%'), fontWeight: 'bold' }}>75%</span></Option>
                        <Option value="100%"><span style={{ color: getProgressColor('100%'), fontWeight: 'bold' }}>100%</span></Option>
                    </Select>
                );
            }
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        ghost
                        icon={<CameraOutlined />}
                        onClick={() => {
                            setCurrentActivity(record);
                            setPhotoBefore(record.photos?.before || null);
                            setPhotoAfter(record.photos?.after || null);
                            setModalMode('photo');
                            setIsChecklistModalOpen(true);
                        }}
                    />
                    <Button
                        type="primary"
                        danger
                        ghost
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record._id)}
                    />
                </Space>
            )
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>
            <Content style={{ padding: '32px 24px' }}>
                <div className="page-content-inner">
                    <div style={{ marginBottom: 32 }}>
                        <h1 className="page-title">Work in Progress</h1>
                        <p style={{ color: '#8c8c8c' }}>Track ongoing work activities</p>
                    </div>

                    <div className="filter-bar" style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                        <Select
                            placeholder="Select Project"
                            style={{ flex: 1 }}
                            onChange={setSelectedProject}
                            value={selectedProject}
                            allowClear
                        >
                            {projects.map(p => <Option key={p._id} value={p._id}>{p.name}</Option>)}
                        </Select>

                        <Select
                            placeholder="Select Building"
                            style={{ flex: 1 }}
                            onChange={(val) => {
                                console.log('Building Selected:', val);
                                setSelectedBuilding(val);
                            }}
                            disabled={!selectedProject}
                            value={selectedBuilding}
                            allowClear
                        >
                            {buildings.map(b => <Option key={b} value={b}>{b}</Option>)}
                        </Select>

                        <Select
                            placeholder="Select Work Type"
                            style={{ flex: 1 }}
                            onChange={setSelectedCategory}
                            value={selectedCategory}
                            allowClear
                        >
                            {WORK_CATEGORIES.map(c => <Option key={c.label} value={c.label}>{c.label}</Option>)}
                        </Select>
                    </div>

                    <Card bordered={false}>
                        {selectedProject && selectedBuilding && selectedCategory ? (
                            <Table
                                columns={columns}
                                dataSource={data}
                                rowKey="_id"
                                loading={loading}
                                pagination={{ pageSize: 10 }}
                                locale={{ emptyText: <Empty description="No work in progress found" /> }}
                            />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Empty description="Please select Project, Building and Work Type to view results" />
                            </div>
                        )}
                    </Card>
                </div>

                {/* Checklist & Photo Upload Modal */}
                <Modal
                    title={
                        modalMode === 'checklist'
                            ? `Verification Checklist: ${currentActivity?.activityName}`
                            : `Activity Photos: ${currentActivity?.activityName}`
                    }
                    open={isChecklistModalOpen}
                    onCancel={() => {
                        setIsChecklistModalOpen(false);
                        setCurrentActivity(null);
                        setChecklistData({});
                        setPhotoBefore(null);
                        setPhotoAfter(null);
                    }}
                    width={800}
                    footer={[
                        <Button key="cancel" onClick={() => {
                            setIsChecklistModalOpen(false);
                            setCurrentActivity(null);
                            setChecklistData({});
                            setPhotoBefore(null);
                            setPhotoAfter(null);
                        }}>
                            Cancel
                        </Button>,
                        <Button
                            key="submit"
                            type="primary"
                            onClick={async () => {
                                try {
                                    if (!currentActivity) return;

                                    const isCompleting = currentActivity.progress === '100%';

                                    // Update activity
                                    const updateData = {
                                        ...currentActivity,
                                        updated: new Date()
                                    };

                                    if (modalMode === 'checklist') {
                                        updateData.progress = '100%';
                                        updateData.status = 'Completed';
                                        updateData.data = checklistData;
                                    } else {
                                        updateData.photos = {
                                            before: photoBefore,
                                            after: photoAfter,
                                        };
                                    }

                                    await request.update({
                                        entity: 'activities',
                                        id: currentActivity._id,
                                        jsonData: updateData
                                    });

                                    // Update unit grade only if completing via checklist
                                    if (modalMode === 'checklist') {
                                        await updateUnitGrade(currentActivity.unitId, '100%');
                                    }

                                    message.success(modalMode === 'checklist' ? 'Activity verified as completed!' : 'Photos saved successfully!');

                                    // If checklist completed, check for photos and show reminder popup if missing
                                    if (modalMode === 'checklist') {
                                        const hasBefore = currentActivity.photos?.before;
                                        const hasAfter = currentActivity.photos?.after;
                                        if (!hasBefore || !hasAfter) {
                                            Modal.warning({
                                                title: 'Photos Missing',
                                                content: 'Please Upload the Before and After Images from the Camera icon in the Actions column.',
                                                okText: 'Understood'
                                            });
                                        }
                                    }

                                    // Refresh data
                                    const res = await request.listAll({ entity: 'activities' });
                                    if (res.success) {
                                        let filtered = res.result || [];
                                        if (selectedProject) filtered = filtered.filter(a => (a.projectId?._id || a.projectId) === selectedProject);
                                        if (selectedBuilding) {
                                            filtered = filtered.filter(a => {
                                                const unit = unitsList.find(u => u._id === (a.unitId?._id || a.unitId));
                                                return (unit?.buildingName || unit?.towerOrWing) === selectedBuilding;
                                            });
                                        }
                                        if (selectedCategory) filtered = filtered.filter(a => a.category === selectedCategory);
                                        setData(filtered);
                                    }

                                    // Close modal
                                    setIsChecklistModalOpen(false);
                                    setCurrentActivity(null);
                                    setChecklistData({});
                                    setPhotoBefore(null);
                                    setPhotoAfter(null);
                                } catch (error) {
                                    message.error('Failed to update activity');
                                    console.error(error);
                                }
                            }}
                        >
                            {currentActivity?.progress === '100%' ? 'Complete Activity' : 'Save Changes'}
                        </Button>
                    ]}
                >
                    <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
                        {/* PHOTO MODE: Only show photo uploads */}
                        {modalMode === 'photo' && (
                            <div style={{ marginBottom: 24 }}>
                                <h3 style={{ marginBottom: 16 }}>Upload Progress Photos</h3>
                                <Space direction="vertical" style={{ width: '100%' }} size="large">
                                    <ImageUpload
                                        label="Photo - Before"
                                        value={photoBefore}
                                        onChange={setPhotoBefore}
                                    />
                                    <ImageUpload
                                        label="Photo - After"
                                        value={photoAfter}
                                        onChange={setPhotoAfter}
                                    />
                                </Space>
                            </div>
                        )}

                        {/* CHECKLIST MODE: Only show verification form */}
                        {modalMode === 'checklist' && currentActivity && COMPLEX_TASK_COMPONENTS[currentActivity.activityName] && (
                            <div style={{ marginTop: 8, padding: 16, border: '1px solid #d9d9d9', borderRadius: 8 }}>
                                <div style={{ marginBottom: 16 }}>
                                    <Tag color="gold">Verification Required for 100% Completion</Tag>
                                </div>
                                <h3 style={{ marginBottom: 16 }}>{currentActivity.activityName} Verification Checklist</h3>
                                {(() => {
                                    const formName = COMPLEX_TASK_COMPONENTS[currentActivity.activityName];
                                    const ActiveForm = FORM_COMPONENTS[formName];
                                    if (ActiveForm) {
                                        return (
                                            <ActiveForm
                                                data={checklistData}
                                                setData={setChecklistData}
                                                currentTask={currentActivity.activityName}
                                            />
                                        );
                                    }
                                    return <Empty description="No verification form available for this activity" />;
                                })()}
                            </div>
                        )}
                    </div>
                </Modal>

                {/* Image Preview Modal */}
                <Modal
                    open={previewVisible}
                    title="Photo Preview"
                    footer={null}
                    onCancel={() => setPreviewVisible(false)}
                    width={800}
                >
                    {previewImage && (
                        <img
                            src={previewImage}
                            alt="Preview"
                            style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                        />
                    )}
                </Modal>
            </Content>
        </Layout>
    );
}
