import React, { useState, useEffect } from 'react';
import { Layout, Select, Card, Empty, Table, Tag, message, Button, Modal, Space, Form, Input } from 'antd';
import { DeleteOutlined, CameraOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import request from '@/request/request';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';
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
    const currentProject = useSelector(selectCurrentProject);
    const shouldLockProject = useSelector(selectShouldLockProject);
    const [projects, setProjects] = useState([]);
    const [unitsList, setUnitsList] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [progressData, setProgressData] = useState({});

    useEffect(() => {
        if (shouldLockProject && currentProject?._id) {
            setSelectedProject(currentProject._id);
        }
    }, [shouldLockProject, currentProject]);

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

            const vendorResult = await request.listAll({ entity: 'vendor', options: { enabled: true } });
            if (vendorResult.success) setVendors(vendorResult.result || []);
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

            const activity = data.find(a => (a._id?._id || a._id).toString() === activityId.toString());
            if (!activity) {
                console.error("Activity not found in current data:", activityId);
                return;
            }

            // Normalization for matching
            const activityName = (activity.activityName || activity.activity || "").trim();
            const hasChecklist = COMPLEX_TASK_COMPONENTS[activityName];

            // If progress is 100%, force photo check first
            if (value === '100%') {
                const hasPhotos = activity.photos?.before && activity.photos?.after;
                if (!hasPhotos) {
                    Modal.warning({
                        title: 'Photos Required',
                        content: 'Please upload both Before and After photos using the Camera icon in the Actions column before marking this task as 100% completed.',
                        okText: 'Understood'
                    });
                    // Revert local progress select is automatic as we don't update setProgressData
                    return;
                }

                if (hasChecklist) {
                    setCurrentActivity({ ...activity, progress: value });
                    setChecklistData(activity.data || {});

                    // Photos are uploaded separately via Camera icon
                    // We just need to check if they exist when user tries to save the checklist
                    setPhotoBefore(activity.photos?.before || null);
                    setPhotoAfter(activity.photos?.after || null);

                    setModalMode('checklist');
                    setIsChecklistModalOpen(true);
                    return;
                }
            }

            // Update local state ONLY if photos exist (for 100%) or for other progress levels
            setProgressData(prev => ({ ...prev, [activityId]: value }));

            // Update activity progress
            await request.update({
                entity: 'activities',
                id: activityId,
                jsonData: { ...activity, progress: value, status }
            });

            // Calculate and update unit grade
            await updateUnitGrade(activity.unitId);
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
        } catch (error) {
            message.error('Failed to update progress');
            console.error(error);
        }
    };


    // Function to calculate and update unit grade based on average progress of all activities
    const updateUnitGrade = async (unitId) => {
        try {
            // Extract unit ID if it's an object
            const actualUnitId = typeof unitId === 'object' ? unitId._id : unitId;

            if (!actualUnitId) {
                console.warn('No unit ID available for grade update');
                return;
            }

            // Fetch ALL activities for this specific unit to calculate total average
            const res = await request.listAll({ entity: 'activities' });
            if (!res.success) return;

            const unitActivities = res.result.filter(a => (a.unitId?._id || a.unitId).toString() === actualUnitId.toString());

            if (unitActivities.length === 0) {
                // If no activities yet, default to grade A
                await request.update({
                    entity: 'units',
                    id: actualUnitId,
                    jsonData: { grade: 'A' }
                });
                return;
            }

            // Calculate average progress
            const totalProgress = unitActivities.reduce((acc, act) => {
                const progValue = parseInt(act.progress || '0');
                return acc + progValue;
            }, 0);

            const averageProgress = totalProgress / unitActivities.length;

            // Determine grade based on average progress
            let grade = 'A';
            if (averageProgress >= 100) {
                grade = 'Ready';
            } else if (averageProgress >= 75) {
                grade = 'A+++';
            } else if (averageProgress >= 50) {
                grade = 'A++';
            } else if (averageProgress >= 25) {
                grade = 'A+';
            } else {
                grade = 'A';
            }

            // Update unit with new grade
            await request.update({
                entity: 'units',
                id: actualUnitId,
                jsonData: { grade }
            });

            console.log(`Unit ${actualUnitId} total average: ${averageProgress}%. Grade updated to ${grade}`);
        } catch (error) {
            console.error('Error updating unit grade:', error);
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

    const handleDelete = async (record) => {
        try {
            const result = await request.delete({ entity: 'activities', id: record._id });
            if (result.success) {
                message.success('Activity deleted successfully');
                // Refresh the data
                setData(prev => prev.filter(item => item._id !== record._id));
                // Recalculate unit grade after deletion
                await updateUnitGrade(record.unitId);
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
            title: 'Contractor', key: 'contractor',
            render: (_, record) => {
                const contractorId = record.contractorId?._id || record.contractorId;
                const vendor = vendors.find(v => v._id === contractorId);
                return vendor?.name || '-';
            },
            sorter: (a, b) => {
                const vendorA = vendors.find(v => v._id === (a.contractorId?._id || a.contractorId))?.name || '';
                const vendorB = vendors.find(v => v._id === (b.contractorId?._id || b.contractorId))?.name || '';
                return vendorA.localeCompare(vendorB);
            }
        },
        {
            title: 'Floor', key: 'floor',
            render: (_, record) => {
                const unit = unitsList.find(u => u._id === (record.unitId?._id || record.unitId));
                const f = unit?.floor ?? unit?.floorNumber;
                return (f === 0 || f === '0') ? 'G' : (f != null ? f : '-');
            },
            sorter: (a, b) => {
                const uA = unitsList.find(u => u._id === (a.unitId?._id || a.unitId));
                const uB = unitsList.find(u => u._id === (b.unitId?._id || b.unitId));
                const fA = (uA?.floor === 0 || uA?.floor === '0') ? 0 : (parseInt(uA?.floor) || 0);
                const fB = (uB?.floor === 0 || uB?.floor === '0') ? 0 : (parseInt(uB?.floor) || 0);
                return fA - fB;
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
                        onClick={() => handleDelete(record)}
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
                        {shouldLockProject && currentProject ? (
                            <Input
                                readOnly
                                disabled
                                style={{ flex: 1, color: 'rgba(0,0,0,0.88)', cursor: 'not-allowed' }}
                                value={currentProject.projectCode ? `${currentProject.name} (${currentProject.projectCode})` : currentProject.name}
                            />
                        ) : (
                            <Select
                                placeholder="Select Project"
                                style={{ flex: 1 }}
                                onChange={setSelectedProject}
                                value={selectedProject}
                                allowClear
                            >
                                {projects.map(p => <Option key={p._id} value={p._id}>{p.name}</Option>)}
                            </Select>
                        )}

                        <Select
                            placeholder="Select Building (optional)"
                            style={{ flex: 1 }}
                            onChange={setSelectedBuilding}
                            disabled={!selectedProject}
                            value={selectedBuilding}
                            allowClear
                        >
                            {buildings.map(b => <Option key={b} value={b}>{b}</Option>)}
                        </Select>

                        <Select
                            placeholder="Select Work Type (optional)"
                            style={{ flex: 1 }}
                            onChange={setSelectedCategory}
                            value={selectedCategory}
                            disabled={!selectedProject}
                            allowClear
                        >
                            {WORK_CATEGORIES.map(c => <Option key={c.label} value={c.label}>{c.label}</Option>)}
                        </Select>
                    </div>

                    <Card bordered={false}>
                        {selectedProject ? (
                            <Table
                                columns={columns}
                                dataSource={data}
                                rowKey="_id"
                                loading={loading}
                                pagination={{ pageSize: 10 }}
                                locale={{
                                    emptyText: (
                                        <Empty
                                            description={
                                                data.length === 0 && !loading
                                                    ? (selectedBuilding || selectedCategory
                                                        ? 'No activities match the selected Building / Work Type'
                                                        : 'No work in progress for this project')
                                                    : 'No work in progress found'
                                            }
                                        />
                                    )
                                }}
                            />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Empty description="Select a project to see all its activities. Then optionally filter by Building and Work Type." />
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
                                        // FORCE PHOTOS for 100% completion - Check if they exist in state or currentActivity
                                        const hasBefore = photoBefore || currentActivity?.photos?.before;
                                        const hasAfter = photoAfter || currentActivity?.photos?.after;

                                        if (!hasBefore || !hasAfter) {
                                            message.error('Please upload BOTH Before and After photos using the Camera icon before completing the verification.');
                                            return;
                                        }
                                        updateData.progress = '100%';
                                        updateData.status = 'Completed';
                                        updateData.data = checklistData;
                                        // Ensure photos are preserved if they were already there
                                        updateData.photos = {
                                            before: hasBefore,
                                            after: hasAfter,
                                        };
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

                                    // NEW: Update local progressData only on success
                                    if (modalMode === 'checklist') {
                                        setProgressData(prev => ({ ...prev, [currentActivity._id]: '100%' }));
                                    }

                                    // Update unit grade only if completing via checklist
                                    if (modalMode === 'checklist') {
                                        await updateUnitGrade(currentActivity.unitId);
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

                        {/* CHECKLIST MODE: Show verification form ONLY */}
                        {modalMode === 'checklist' && currentActivity && (
                            <div style={{ marginTop: 8 }}>
                                {COMPLEX_TASK_COMPONENTS[currentActivity.activityName] && (
                                    <div style={{ padding: 16, border: '1px solid #d9d9d9', borderRadius: 8 }}>
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
