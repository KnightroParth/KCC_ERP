import React, { useState, useEffect } from 'react';
import { Layout, Select, Card, Empty, Table, Tag, message, Button, Modal, Space, Form, Input, Popconfirm } from 'antd';
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
import WaterProofingForm from '@/pages/work/planning/components/WaterProofingForm';
import PlumbingIExtraForm from '@/pages/work/planning/components/PlumbingIExtraForm';
import PlumbingEForm from '@/pages/work/planning/components/PlumbingEForm';
import TilesExtraForm from '@/pages/work/planning/components/TilesExtraForm';
import POPForm from '@/pages/work/planning/components/POPForm';
import CivilWorkForm from '@/pages/work/planning/components/CivilWorkForm';
import FabricationForm from '@/pages/work/planning/components/FabricationForm';
import PaintingForm from '@/pages/work/planning/components/PaintingForm';
import FinishingWForm from '@/pages/work/planning/components/FinishingWForm';
import FinishingDForm from '@/pages/work/planning/components/FinishingDForm';

// Component Mapping for checklists
const FORM_COMPONENTS = {
    'SlabReinforcementForm': SlabReinforcementForm,
    'MivanCenteringForm': MivanCenteringForm,
    'ElectricalWorkIForm': ElectricalWorkIForm,
    'ElectricalWorkEForm': ElectricalWorkEForm,
    'PlumbingForm': PlumbingForm,
    'TilesForm': TilesForm,
    'WaterProofingForm': WaterProofingForm,
    'PlumbingIExtraForm': PlumbingIExtraForm,
    'PlumbingEForm': PlumbingEForm,
    'TilesExtraForm': TilesExtraForm,
    'POPForm': POPForm,
    'CivilWorkForm': CivilWorkForm,
    'FabricationForm': FabricationForm,
    'PaintingForm': PaintingForm,
    'FinishingWForm': FinishingWForm,
    'FinishingDForm': FinishingDForm,
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
            const projectObj = projects.find(p => p._id === selectedProject);
            const targetCode = projectObj?.projectCode || projectObj?.projectId;

            const projectUnits = unitsList.filter(u => {
                const unitProjectId = u.projectId?._id || u.projectId;
                return unitProjectId === targetCode || unitProjectId === selectedProject;
            });

            const uniqueBuildings = [...new Set(projectUnits.map(u => u.buildingName || u.towerOrWing).filter(Boolean))].sort();
            setBuildings(uniqueBuildings);
        } else {
            setBuildings([]);
        }
        setSelectedBuilding(null);
    }, [selectedProject, unitsList, projects]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            await request.post({ entity: 'plannedwork/carry-forward', jsonData: {} });

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

    useEffect(() => {
        fetchActivities();
    }, [selectedProject, selectedBuilding, selectedCategory, unitsList]);

    const handleProgressChange = async (activityId, value) => {
        try {
            let status = 'In Progress';
            if (value === '0%') status = 'Pending';
            else if (value === '100%') status = 'Completed';

            const activity = data.find(a => (a._id?._id || a._id).toString() === activityId.toString());
            if (!activity) return;

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
                    return;
                }

                if (hasChecklist) {
                    setCurrentActivity({ ...activity, progress: value });
                    setChecklistData(activity.data || {});
                    setPhotoBefore(activity.photos?.before || null);
                    setPhotoAfter(activity.photos?.after || null);
                    setModalMode('checklist');
                    setIsChecklistModalOpen(true);
                    return;
                }
            }

            setProgressData(prev => ({ ...prev, [activityId]: value }));
            await request.update({
                entity: 'activities',
                id: activityId,
                jsonData: { ...activity, progress: value, status }
            });
            await updateUnitGrade(activity.unitId);
            message.success(`Progress updated to ${value} - Status: ${status}`);
            await fetchActivities();
        } catch (error) {
            message.error('Failed to update progress');
            console.error(error);
        }
    };

    const updateUnitGrade = async (unitId) => {
        try {
            const actualUnitId = typeof unitId === 'object' ? unitId._id : unitId;
            if (!actualUnitId) return;

            const res = await request.listAll({ entity: 'activities' });
            if (!res.success) return;

            const unitActivities = res.result.filter(a => (a.unitId?._id || a.unitId).toString() === actualUnitId.toString());

            if (unitActivities.length === 0) {
                await request.update({ entity: 'units', id: actualUnitId, jsonData: { grade: 'A' } });
                return;
            }

            const totalProgress = unitActivities.reduce((acc, act) => acc + parseInt(act.progress || '0'), 0);
            const averageProgress = totalProgress / unitActivities.length;

            let grade = 'A';
            if (averageProgress >= 100) grade = 'Ready';
            else if (averageProgress >= 75) grade = 'A+++';
            else if (averageProgress >= 50) grade = 'A++';
            else if (averageProgress >= 25) grade = 'A+';

            await request.update({ entity: 'units', id: actualUnitId, jsonData: { grade } });
        } catch (error) {
            console.error('Error updating unit grade:', error);
        }
    };

    const getProgressColor = (progress) => {
        const colors = {
            '0%': '#ff4d4f',
            '25%': '#ffa940',
            '50%': '#fadb14',
            '75%': '#95de64',
            '99%': '#36cfc9',
            '100%': '#52c41a'
        };
        return colors[progress] || '#d9d9d9';
    };

    const handleDelete = async (record) => {
        try {
            const result = await request.delete({ entity: 'activities', id: record._id });
            if (result.success) {
                message.success('Activity deleted successfully');
                setData(prev => prev.filter(item => item._id !== record._id));
                await updateUnitGrade(record.unitId);
            } else {
                message.error('Failed to delete activity');
            }
        } catch (error) {
            message.error('An error occurred while deleting');
            console.error(error);
        }
    };

    const handleDeleteAll = async () => {
        try {
            setLoading(true);
            const result = await request.post({ entity: 'activities/delete-all' });
            if (result.success) {
                message.success('All activities and planned work deleted successfully');
                setData([]);
                const unitsResult = await request.listAll({ entity: 'units' });
                if (unitsResult.success) {
                    for (const unit of unitsResult.result) {
                        await updateUnitGrade(unit._id);
                    }
                }
            } else {
                message.error('Failed to delete activities');
            }
        } catch (error) {
            message.error('An error occurred while deleting all activities');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusConfig = (progress) => {
        if (progress === '0%') return { text: 'Pending', color: 'default' };
        if (progress === '99%') return { text: 'Photos Verified', color: 'cyan' };
        if (progress === '100%') return { text: 'Completed', color: 'success' };
        return { text: 'In Progress', color: 'orange' };
    };

    const closeModal = () => {
        setIsChecklistModalOpen(false);
        setCurrentActivity(null);
        setChecklistData({});
        setPhotoBefore(null);
        setPhotoAfter(null);
    };

    // ─── Photo save handler ────────────────────────────────────────────────────
    const handlePhotoSave = async () => {
        try {
            if (!currentActivity) return;

            const activityName = (currentActivity.activityName || currentActivity.activity || "").trim();
            const isExtraWork = currentActivity.category === 'Extra Work' || activityName === 'Extra Work';
            const hasChecklist = COMPLEX_TASK_COMPONENTS[activityName];

            const hasBefore = photoBefore || currentActivity?.photos?.before;
            const hasAfter = photoAfter || currentActivity?.photos?.after;

            // Determine new progress
            let newProgress = currentActivity.progress;
            let newStatus = currentActivity.status;

            if (hasBefore && hasAfter && currentActivity.progress !== '100%') {
                if (isExtraWork) {
                    newProgress = '100%';
                    newStatus = 'Completed';
                } else {
                    newProgress = '99%';
                    newStatus = 'In Progress';
                }
            }

            const updateData = {
                ...currentActivity,
                photos: {
                    before: hasBefore || photoBefore,
                    after: hasAfter || photoAfter,
                },
                progress: newProgress,
                status: newStatus,
                updated: new Date(),
            };

            await request.update({
                entity: 'activities',
                id: currentActivity._id,
                jsonData: updateData,
            });

            // Update local progress state
            if (newProgress !== currentActivity.progress) {
                setProgressData(prev => ({ ...prev, [currentActivity._id]: newProgress }));
            }

            message.success('Photos saved successfully!');

            // ── AUTO-OPEN CHECKLIST if photos are complete and checklist exists ──
            if (hasBefore && hasAfter && hasChecklist && !isExtraWork && newProgress !== '100%') {
                // Fetch latest activity so checklist gets fresh data
                const res = await request.listAll({ entity: 'activities' });
                const freshActivity = res.success
                    ? (res.result.find(a => (a._id?._id || a._id).toString() === currentActivity._id.toString()) || currentActivity)
                    : currentActivity;

                // Transition directly to checklist mode (no close/reopen flash)
                setCurrentActivity({ ...freshActivity, progress: '100%' });
                setChecklistData(freshActivity.data || {});
                setPhotoBefore(hasBefore);
                setPhotoAfter(hasAfter);
                setModalMode('checklist');
                // Modal stays open, just switches mode
                return;
            }

            // For Extra Work or no checklist: close and refresh
            if (isExtraWork && hasBefore && hasAfter) {
                await updateUnitGrade(currentActivity.unitId);
            }
            closeModal();
            await fetchActivities();
        } catch (error) {
            message.error('Failed to save photos');
            console.error(error);
        }
    };

    // ─── Checklist complete handler ────────────────────────────────────────────
    const handleChecklistComplete = async () => {
        try {
            if (!currentActivity) return;

            const hasBefore = photoBefore || currentActivity?.photos?.before;
            const hasAfter = photoAfter || currentActivity?.photos?.after;

            if (!hasBefore || !hasAfter) {
                message.error('Please upload BOTH Before and After photos using the Camera icon before completing the verification.');
                return;
            }

            const updateData = {
                ...currentActivity,
                progress: '100%',
                status: 'Completed',
                data: checklistData,
                photos: { before: hasBefore, after: hasAfter },
                updated: new Date(),
            };

            await request.update({
                entity: 'activities',
                id: currentActivity._id,
                jsonData: updateData,
            });

            setProgressData(prev => ({ ...prev, [currentActivity._id]: '100%' }));
            await updateUnitGrade(currentActivity.unitId);
            message.success('Activity verified and marked as 100% complete!');
            closeModal();
            await fetchActivities();
        } catch (error) {
            message.error('Failed to complete activity');
            console.error(error);
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
                return (
                    <Space direction="vertical" size="small">
                        <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
                        {record.data?.carryForwarded && (
                            <Tag color="volcano" style={{ marginTop: 4 }}>Carry Forwarded</Tag>
                        )}
                    </Space>
                );
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
                        style={{ width: '100%', borderColor: color, color: color, fontWeight: 'bold' }}
                        size="small"
                        className="progress-select"
                    >
                        <Option value="0%"><span style={{ color: getProgressColor('0%'), fontWeight: 'bold' }}>0%</span></Option>
                        <Option value="25%"><span style={{ color: getProgressColor('25%'), fontWeight: 'bold' }}>25%</span></Option>
                        <Option value="50%"><span style={{ color: getProgressColor('50%'), fontWeight: 'bold' }}>50%</span></Option>
                        <Option value="75%"><span style={{ color: getProgressColor('75%'), fontWeight: 'bold' }}>75%</span></Option>
                        <Option value="99%" disabled><span style={{ color: getProgressColor('99%'), fontWeight: 'bold' }}>99%</span></Option>
                        <Option value="100%" disabled><span style={{ color: getProgressColor('100%'), fontWeight: 'bold' }}>100%</span></Option>
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
                    <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 className="page-title">Work in Progress</h1>
                            <p style={{ color: '#8c8c8c' }}>Track ongoing work activities</p>
                        </div>
                        <Popconfirm
                            title="Delete all activities?"
                            description="Are you sure you want to delete ALL activities and their planned work entries? This action cannot be undone."
                            onConfirm={handleDeleteAll}
                            okText="Yes, Delete All"
                            cancelText="No"
                            okButtonProps={{ danger: true }}
                        >
                            <Button type="primary" danger icon={<DeleteOutlined />}>
                                Delete All
                            </Button>
                        </Popconfirm>
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

                {/* Unified Checklist & Photo Modal */}
                <Modal
                    title={
                        modalMode === 'checklist'
                            ? `✅ Verification Checklist: ${currentActivity?.activityName}`
                            : `📷 Upload Photos: ${currentActivity?.activityName}`
                    }
                    open={isChecklistModalOpen}
                    onCancel={closeModal}
                    width={800}
                    footer={[
                        <Button key="cancel" onClick={closeModal}>
                            Cancel
                        </Button>,
                        <Button
                            key="submit"
                            type="primary"
                            onClick={modalMode === 'photo' ? handlePhotoSave : handleChecklistComplete}
                        >
                            {modalMode === 'checklist' ? 'Complete Activity (100%)' : 'Save Photos'}
                        </Button>
                    ]}
                >
                    <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
                        {/* PHOTO MODE */}
                        {modalMode === 'photo' && (
                            <div style={{ marginBottom: 24 }}>
                                <p style={{ color: '#595959', marginBottom: 16 }}>
                                    Upload both Before and After photos. Once both are saved, the verification checklist will open automatically.
                                </p>
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

                        {/* CHECKLIST MODE */}
                        {modalMode === 'checklist' && currentActivity && (
                            <div style={{ marginTop: 8 }}>
                                {COMPLEX_TASK_COMPONENTS[currentActivity.activityName] ? (
                                    <div style={{ padding: 16, border: '1px solid #d9d9d9', borderRadius: 8 }}>
                                        <div style={{ marginBottom: 16 }}>
                                            <Tag color="gold">Fill checklist to mark activity 100% complete</Tag>
                                        </div>
                                        <h3 style={{ marginBottom: 16 }}>{currentActivity.activityName} — Verification Checklist</h3>
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
                                ) : (
                                    <Empty description="No verification form available for this activity" />
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
