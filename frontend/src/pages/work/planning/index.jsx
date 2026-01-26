import React, { useState, useEffect } from 'react';
import { Layout, Select, Card, Empty, Typography, Table, Checkbox, Button, Modal, Form, DatePicker, Row, Col, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { WORK_CATEGORIES, COMPLEX_TASK_COMPONENTS } from '@/pages/AssignWork/config';
import { assignWork } from '@/request/assignWork';
import request from '@/request/request';

// Complex form components removed - moved to Activities

const { Content } = Layout;
const { Option } = Select;

// FORM_COMPONENTS removed - moved to Activities
const FORM_COMPONENTS = {};

export default function Planning() {
    const [projects, setProjects] = useState([]);
    const [unitsList, setUnitsList] = useState([]);
    const [staff, setStaff] = useState([]);
    const [vendors, setVendors] = useState([]);

    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const [buildings, setBuildings] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [tableData, setTableData] = useState([]);

    const [form] = Form.useForm();

    // Global Header State
    const [headerDetails, setHeaderDetails] = useState({
        startDate: null,
        endDate: null,
        siteEngineer: null,
        supervisor: null,
        incharge: null,
        contractor: null
    });

    // Fetch Initial Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingProjects(true);
                const projectResult = await assignWork.fetchProjects();
                if (projectResult.success) setProjects(projectResult.result || []);

                const unitsResult = await assignWork.fetchUnits();
                if (unitsResult.success) setUnitsList(unitsResult.result || []);

                const staffResult = await request.list({ entity: 'labour', options: { status: 'Active' } });
                if (staffResult.result) setStaff(staffResult.result);

                const vendorResult = await request.list({ entity: 'vendor', options: { enabled: true } });
                if (vendorResult.result) setVendors(vendorResult.result);

            } catch (error) {
                console.error('Error fetching initial data:', error);
            } finally {
                setLoadingProjects(false);
            }
        };
        fetchData();
    }, []);

    // Update Buildings when Project changes
    useEffect(() => {
        if (selectedProject && unitsList.length > 0) {
            const getBuildingName = (unit) => unit.buildingName || unit.towerOrWing;
            const projectUnits = unitsList.filter(u => {
                if (!u) return false;
                const unitProjectId = typeof u.projectId === 'object' ? u.projectId._id : u.projectId;
                return unitProjectId === selectedProject._id || unitProjectId === selectedProject.projectCode;
            });

            const uniqueBuildings = [...new Set(projectUnits.map(getBuildingName).filter(Boolean))].sort();
            setBuildings(uniqueBuildings);
        } else {
            setBuildings([]);
        }
        setSelectedBuilding(null);
    }, [selectedProject, unitsList]);


    // Handle Checkbox Change (Simple or Complex Task now simplified to checkbox in Planning)
    const handleCheckboxChange = async (record, taskName, checked) => {
        if (!selectedProject || !headerDetails.contractor) {
            message.warning('Please select a project and contractor first');
            return;
        }

        try {
            // Find if a checklist entry already exists for this unit, task, and contractor
            const res = await request.list({
                entity: 'checklist',
                options: {
                    projectId: selectedProject._id,
                    unitNumber: record.unitNumber,
                    type: taskName,
                    'personnel.contractor': headerDetails.contractor
                }
            });

            const payload = {
                projectId: selectedProject._id,
                unitNumber: record.unitNumber,
                type: taskName,
                startDate: headerDetails.startDate,
                endDate: headerDetails.endDate,
                personnel: {
                    siteEngineer: headerDetails.siteEngineer,
                    supervisor: headerDetails.supervisor,
                    incharge: headerDetails.incharge,
                    contractor: headerDetails.contractor,
                },
                data: { checked }
            };

            let response;
            if (res.result && res.result.length > 0) {
                response = await request.update({ entity: 'checklist', id: res.result[0]._id, jsonData: payload });
            } else {
                response = await request.create({ entity: 'checklist', jsonData: payload });
            }

            if (response.success) {
                // Update local state
                setTableData(prev => prev.map(row => {
                    if (row.unitNumber === record.unitNumber) {
                        return { ...row, [taskName]: checked };
                    }
                    return row;
                }));
                message.success(`${taskName} updated`);
            } else {
                message.error('Update Failed');
            }
        } catch (e) {
            console.error(e);
            message.error('An error occurred');
        }
    };

    // handleSaveChecklist removed - complex forms moved to Activities


    // Prepare Data for Table
    useEffect(() => {
        const fetchChecklistStates = async () => {
            if (selectedProject && selectedBuilding && selectedCategory && headerDetails.contractor) {
                const buildingUnits = getBuildingUnits();
                const checklistItems = selectedCategory.fields || [];

                // Fetch all checklists for this project, category items, and contractor
                const res = await request.list({
                    entity: 'checklist',
                    options: {
                        projectId: selectedProject._id,
                        'personnel.contractor': headerDetails.contractor
                    }
                });

                const existingChecklists = res.result || [];

                const data = buildingUnits.map(unit => {
                    const unitData = {
                        _id: unit._id,
                        unitNumber: unit.unitNumber,
                    };

                    checklistItems.forEach(item => {
                        const found = existingChecklists.find(c =>
                            c.unitNumber === unit.unitNumber && c.type === item
                        );
                        // If complex data exists, we consider it checked if it has any rows or content
                        // For simple checkboxes, we check the data.checked property
                        if (found) {
                            if (found.data?.checked !== undefined) {
                                unitData[item] = found.data.checked;
                            } else if (found.data?.rows) {
                                unitData[item] = found.data.rows.length > 0;
                            } else {
                                unitData[item] = true;
                            }
                        } else {
                            unitData[item] = false;
                        }
                    });

                    return unitData;
                });
                setTableData(data);
            } else {
                setTableData([]);
            }
        };
        fetchChecklistStates();
    }, [selectedProject, selectedBuilding, selectedCategory, headerDetails.contractor]);

    const getBuildingUnits = () => {
        if (!selectedProject || !selectedBuilding) return [];
        return unitsList.filter(u => {
            if (!u) return false;
            const unitProjectId = typeof u.projectId === "object" ? u.projectId._id : u.projectId;
            const matchesProject = unitProjectId === selectedProject._id || unitProjectId === selectedProject.projectCode;
            const buildingName = u.buildingName || u.towerOrWing;
            return matchesProject && buildingName === selectedBuilding;
        }).sort((a, b) => {
            const numA = parseInt(a.unitNumber?.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.unitNumber?.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
    };

    // FORM_COMPONENTS logic removed

    return (
        <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>
            <Content style={{ padding: '32px 24px' }}>
                <div className="page-content-inner">
                    <div style={{ marginBottom: 32 }}>
                        <h1 className="page-title">Planning</h1>
                        <p style={{ color: '#8c8c8c' }}>Manage planning and quality checklists</p>
                    </div>

                    <div className="filter-bar">
                        <Select
                            placeholder="Select Project"
                            style={{ flex: 1, minWidth: 200 }}
                            onChange={(val) => {
                                const p = projects.find(x => x._id === val);
                                setSelectedProject(p);
                            }}
                            value={selectedProject?._id}
                        >
                            {projects.map(p => <Option key={p._id} value={p._id}>{p.name}</Option>)}
                        </Select>

                        <Select
                            placeholder="Select Building"
                            style={{ flex: 1, minWidth: 200 }}
                            onChange={setSelectedBuilding}
                            disabled={!selectedProject}
                            value={selectedBuilding}
                        >
                            {buildings.map(b => <Option key={b} value={b}>{b}</Option>)}
                        </Select>

                        <Select
                            placeholder="Select Work Type"
                            style={{ flex: 1, minWidth: 200 }}
                            onChange={(val) => setSelectedCategory(WORK_CATEGORIES.find(c => c.id === val))}
                            disabled={!selectedProject || !selectedBuilding}
                            value={selectedCategory?.id}
                        >
                            {WORK_CATEGORIES.map(c => <Option key={c.id} value={c.id}>{c.label}</Option>)}
                        </Select>
                    </div>

                    {/* Global Header Inputs */}
                    {selectedProject && (
                        <Card bordered={false} style={{ marginBottom: 24 }} size="small">
                            <Row gutter={[16, 16]}>
                                <Col span={4}>
                                    <div style={{ marginBottom: 4, fontWeight: 500 }}>Start Date</div>
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        value={headerDetails.startDate}
                                        onChange={(date) => setHeaderDetails(prev => ({ ...prev, startDate: date }))}
                                    />
                                </Col>
                                <Col span={4}>
                                    <div style={{ marginBottom: 4, fontWeight: 500 }}>End Date</div>
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        value={headerDetails.endDate}
                                        onChange={(date) => setHeaderDetails(prev => ({ ...prev, endDate: date }))}
                                    />
                                </Col>
                                <Col span={4}>
                                    <div style={{ marginBottom: 4, fontWeight: 500 }}>Site Engineer</div>
                                    <Select
                                        style={{ width: '100%' }}
                                        placeholder="Select"
                                        showSearch
                                        optionFilterProp="label"
                                        options={staff.map(s => ({ label: s.name, value: s._id }))}
                                        value={headerDetails.siteEngineer}
                                        onChange={(val) => setHeaderDetails(prev => ({ ...prev, siteEngineer: val }))}
                                    />
                                </Col>
                                <Col span={4}>
                                    <div style={{ marginBottom: 4, fontWeight: 500 }}>Supervisor</div>
                                    <Select
                                        style={{ width: '100%' }}
                                        placeholder="Select"
                                        showSearch
                                        optionFilterProp="label"
                                        options={staff.map(s => ({ label: s.name, value: s._id }))}
                                        value={headerDetails.supervisor}
                                        onChange={(val) => setHeaderDetails(prev => ({ ...prev, supervisor: val }))}
                                    />
                                </Col>
                                <Col span={4}>
                                    <div style={{ marginBottom: 4, fontWeight: 500 }}>Incharge</div>
                                    <Select
                                        style={{ width: '100%' }}
                                        placeholder="Select"
                                        showSearch
                                        optionFilterProp="label"
                                        options={staff.map(s => ({ label: s.name, value: s._id }))}
                                        value={headerDetails.incharge}
                                        onChange={(val) => setHeaderDetails(prev => ({ ...prev, incharge: val }))}
                                    />
                                </Col>
                                <Col span={4}>
                                    <div style={{ marginBottom: 4, fontWeight: 500 }}>Contractor</div>
                                    <Select
                                        style={{ width: '100%' }}
                                        placeholder="Select"
                                        showSearch
                                        optionFilterProp="label"
                                        options={vendors.map(v => ({ label: v.name, value: v._id }))}
                                        value={headerDetails.contractor}
                                        onChange={(val) => setHeaderDetails(prev => ({ ...prev, contractor: val }))}
                                    />
                                </Col>
                            </Row>
                        </Card>
                    )}

                    {selectedProject && selectedBuilding && selectedCategory ? (
                        <Card bordered={false} style={{ marginTop: 24 }}>
                            {!headerDetails.contractor && <div style={{ marginBottom: 16, color: '#faad14' }}>Please select a contractor to enable checkboxes</div>}
                            <PlanningTable
                                data={tableData}
                                category={selectedCategory}
                                onCheckChange={handleCheckboxChange}
                                disabled={!headerDetails.contractor}
                            />
                        </Card>
                    ) : (
                        <Empty description="Select filters to view planning" style={{ marginTop: 40 }} />
                    )}
                </div>
            </Content>

            {/* Modal for complex forms removed - moved to Activities */}
        </Layout>
    );
}

function PlanningTable({ data, category, onCheckChange, disabled }) {
    const checklist = category?.fields || [];

    const columns = [
        {
            title: 'Flat / Unit No.',
            dataIndex: 'unitNumber',
            key: 'unitNumber',
            width: 120,
            fixed: 'left',
            render: (text) => <strong>{text}</strong>,
        },
        ...checklist.map((item, index) => ({
            title: item,
            dataIndex: item,
            key: `item-${index}`,
            width: 80,
            align: 'center',
            render: (checked, record) => (
                <Checkbox
                    checked={checked || false}
                    onChange={(e) => onCheckChange(record, item, e.target.checked)}
                    disabled={disabled}
                />
            ),
        })),
    ];

    return (
        <Table
            columns={columns}
            dataSource={data}
            rowKey="_id"
            pagination={{ pageSize: 12 }}
            scroll={{ x: 'max-content' }}
        />
    );
}
