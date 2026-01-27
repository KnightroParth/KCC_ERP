import React, { useState, useEffect } from 'react';
import { Layout, Select, Card, Empty, Typography, Table, Checkbox, Button, Modal, Form, DatePicker, Row, Col, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { WORK_CATEGORIES, COMPLEX_TASK_COMPONENTS } from '@/config/workConfig';
import { assignWork } from '@/request/assignWork';
import request from '@/request/request';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Complex form components removed - moved to Activities


const { Content } = Layout;
const { Option } = Select;

// FORM_COMPONENTS removed - moved to Activities

function generatePDF(data, vendors, staff, groupOption, headerDetails) {
    const doc = new jsPDF();

    // Helper to get name
    const getName = (id, list) => {
        if (!id) return '-';
        const item = list.find(x => x._id === (id._id || id));
        return item ? item.name : '-';
    };

    // Extract Header Details from Props
    const siteEngineerName = getName(headerDetails.siteEngineer, staff);
    const inchargeName = getName(headerDetails.incharge, staff);
    const supervisorName = getName(headerDetails.supervisor, staff);

    // Date Range from Header Props
    const minDate = headerDetails.startDate ? dayjs(headerDetails.startDate).format('DD/MM/YYYY') : '-';
    const maxDate = headerDetails.endDate ? dayjs(headerDetails.endDate).format('DD/MM/YYYY') : '-';

    // Title
    doc.setFontSize(18);
    doc.text("KCC Construction - 15 Days Planning Chart", 14, 22);

    doc.setFontSize(10);
    doc.text(`Generated on: ${dayjs().format('DD/MM/YYYY')}`, 14, 30);
    doc.text(`From: ${minDate} To: ${maxDate}`, 120, 30);

    doc.text(`Site Engineer: ${siteEngineerName}`, 14, 36);
    doc.text(`Incharge: ${inchargeName}`, 14, 42);
    doc.text(`Supervisor: ${supervisorName}`, 14, 48);

    // Grouping Logic
    const groupedData = {};
    data.forEach(item => {
        const groupKey = groupOption === 'Contractors'
            ? (vendors.find(v => v._id === (item.contractorId?._id || item.contractorId))?.name || 'Unknown')
            : (item.category || 'Other');

        if (!groupedData[groupKey]) groupedData[groupKey] = [];
        groupedData[groupKey].push(item);
    });

    let yPos = 55;

    Object.entries(groupedData).forEach(([groupName, items]) => {
        // Sort items by Work Type -> Building -> Unit
        items.sort((a, b) => {
            const wtA = a.workType || a.category || '';
            const wtB = b.workType || b.category || '';
            if (wtA !== wtB) return wtA.localeCompare(wtB);

            const bA = a.buildingName || '';
            const bB = b.buildingName || '';
            if (bA !== bB) return bA.localeCompare(bB);

            return (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true });
        });

        // Table Columns (Removed Qty and Total)
        const tableBody = items.map(item => {
            const contractorName = vendors.find(v => v._id === (item.contractorId?._id || item.contractorId))?.name || '-';
            const dateStr = item.startDate ? dayjs(item.startDate).format('DD/MM/YYYY') : '-';
            const rate = item.rate || 0;

            return [
                item.workType || item.category,
                contractorName,
                dateStr,
                item.buildingName,
                item.unitNumber,
                rate.toFixed(2)
            ];
        });

        // Group Header
        doc.setFontSize(12);
        doc.text(`${groupOption}: ${groupName}`, 14, yPos);
        yPos += 6;

        autoTable(doc, {
            startY: yPos,
            head: [['Task', 'Contractor', 'Date', 'Building', 'Unit', 'Rate']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [22, 119, 255] },
            columnStyles: {
                0: { cellWidth: 50 },
                2: { cellWidth: 25 },
                5: { halign: 'right' },
            },
            didDrawPage: (data) => {
                yPos = data.cursor.y;
            }
        });

        // Subtotal (Restored)
        const subTotal = items.reduce((sum, item) => sum + (item.rate || 0), 0);
        doc.setFontSize(10);
        doc.text(`SubTotal: ${subTotal.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
        yPos = doc.lastAutoTable.finalY + 20;

        // Add page if needed
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
    });

    // Grand Total (Restored)
    const grandTotal = data.reduce((sum, item) => sum + (item.rate || 0), 0);
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(22, 119, 255);

    // Draw total box
    if (yPos > 270) {
        doc.addPage();
        yPos = 20;
    }
    doc.rect(14, yPos, 180, 10, 'F');
    doc.text(`Grand Total: ${grandTotal.toFixed(2)}`, 160, yPos + 7, { align: 'right' });

    doc.save('planning-chart.pdf');
}

const FORM_COMPONENTS = {};

export default function Planning() {
    const [projects, setProjects] = useState([]);
    const [unitsList, setUnitsList] = useState([]);
    const [staff, setStaff] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [plannedWorks, setPlannedWorks] = useState([]);

    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const [buildings, setBuildings] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [tableData, setTableData] = useState([]);
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [chartGroupOption, setChartGroupOption] = useState('Contractors');
    const [saving, setSaving] = useState(false);

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

                const materialResult = await request.listAll({ entity: 'inventory/material' });
                if (materialResult.success) setMaterials(materialResult.result || []);

                const plannedResult = await request.listAll({ entity: 'plannedwork' });
                if (plannedResult.success) setPlannedWorks(plannedResult.result || []);

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


    // Handle Checkbox Change (Strict Contractor Check)
    const handleCheckboxChange = async (record, taskName, checked) => {
        if (!selectedProject || !headerDetails.contractor) {
            message.warning('Please select a project and contractor first');
            return;
        }

        const currentContractorId = typeof headerDetails.contractor === 'object' ? headerDetails.contractor._id : headerDetails.contractor;

        try {
            // Find if a checklist entry already exists for this unit, task, and contractor
            const res = await request.listAll({
                entity: 'checklist',
                options: {
                    projectId: selectedProject._id,
                    unitNumber: record.unitNumber,
                    type: taskName,
                    'personnel.contractor': currentContractorId
                }
            });

            // STRICT FILTERING: Ensure we only update the record that matches OUR contractor
            // The backend query might be loose or ignore nested keys depending on implementation, so we verify here.
            const existingRecord = res.result?.find(r => {
                const rContractorId = r.personnel?.contractor?._id || r.personnel?.contractor;
                return rContractorId === currentContractorId;
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
            if (existingRecord) {
                response = await request.update({ entity: 'checklist', id: existingRecord._id, jsonData: payload });
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

    const handleAddPlanning = async () => {
        if (!selectedProject || !headerDetails.contractor || !selectedCategory) {
            message.warning('Please select project, contractor, and work type');
            return;
        }

        setSaving(true);
        try {
            const checkedUnits = tableData.filter(row => {
                return Object.entries(row).some(([key, val]) => val === true && key !== 'unitNumber' && key !== '_id');
            });

            if (checkedUnits.length === 0) {
                message.warning('No items selected in the planning table');
                setSaving(false);
                return;
            }

            const promises = [];
            for (const unit of checkedUnits) {
                // Find which specific tasks are checked for this unit
                const checkedTasks = Object.entries(unit).filter(([key, val]) => val === true && key !== 'unitNumber' && key !== '_id').map(([key]) => key);

                for (const taskName of checkedTasks) {
                    // Check for existing planned work to avoid redundancy
                    const existing = plannedWorks.find(pw =>
                        (pw.projectId?._id === selectedProject._id || pw.projectId === selectedProject._id) &&
                        pw.unitNumber === unit.unitNumber &&
                        pw.category === selectedCategory.label &&
                        pw.workType === taskName
                    );

                    if (existing) {
                        console.log(`Skipping duplicate plan for Unit ${unit.unitNumber} - ${taskName}`);
                        continue;
                    }

                    // Try to find rate by task name first, then category
                    const material = materials.find(m =>
                        m.name.toLowerCase().includes(taskName.toLowerCase()) ||
                        m.category?.toLowerCase() === selectedCategory.label.toLowerCase()
                    );
                    const rate = material ? material.price || 0 : 0;

                    const payload = {
                        projectId: selectedProject._id,
                        buildingName: selectedBuilding,
                        category: selectedCategory.label,
                        workType: taskName,
                        unitNumber: unit.unitNumber,
                        startDate: headerDetails.startDate,
                        endDate: headerDetails.endDate,
                        contractorId: headerDetails.contractor,
                        siteEngineer: headerDetails.siteEngineer,
                        supervisor: headerDetails.supervisor,
                        incharge: headerDetails.incharge,
                        rate: rate
                    };
                    promises.push(request.create({ entity: 'plannedwork', jsonData: payload }));

                    // Also create an Activity record if it doesn't exist
                    const activityData = {
                        projectId: selectedProject._id,
                        unitId: unit._id,
                        contractorId: headerDetails.contractor,
                        activityCode: `PLAN-${Date.now()}-${unit.unitNumber}`,
                        activityName: taskName,
                        category: selectedCategory.label,
                        defaultRate: rate,
                        data: { planned: true }
                    };
                    promises.push(request.create({ entity: 'activities', jsonData: activityData }));
                }
            }

            await Promise.all(promises);
            message.success('Planning added successfully');

            // Refresh planned works
            const plannedResult = await request.listAll({ entity: 'plannedwork' });
            if (plannedResult.success) setPlannedWorks(plannedResult.result || []);

        } catch (error) {
            console.error('Error adding planning:', error);
            message.error('Failed to add planning');
        } finally {
            setSaving(false);
        }
    };
    const handleDeletePlannedWork = async (id) => {
        try {
            const result = await request.delete({ entity: 'plannedwork', id });
            if (result.success) {
                message.success('Planning item deleted');
                setPlannedWorks(prev => prev.filter(item => item._id !== id));
            } else {
                message.error('Failed to delete planning item');
            }
        } catch (error) {
            console.error('Error deleting planning item:', error);
            message.error('An error occurred');
        }
    };

    // Prepare Data for Table
    useEffect(() => {
        const fetchChecklistStates = async () => {
            if (selectedProject && selectedBuilding && selectedCategory && headerDetails.contractor) {
                const buildingUnits = getBuildingUnits();
                const checklistItems = selectedCategory.fields || [];
                const currentContractorId = typeof headerDetails.contractor === 'object' ? headerDetails.contractor._id : headerDetails.contractor;

                // Fetch all checklists for this project, category items, and contractor
                const res = await request.listAll({
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
                        // Strict filter by contractor ID
                        const found = existingChecklists.find(c => {
                            const cContractorId = c.personnel?.contractor?._id || c.personnel?.contractor;
                            return c.unitNumber === unit.unitNumber &&
                                c.type === item &&
                                cContractorId === currentContractorId;
                        });

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

                    <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <Button
                                onClick={() => setIsChartModalOpen(true)}
                                style={{ marginRight: 16 }}
                            >
                                View 15 days Planning Chart
                            </Button>
                            <Select
                                value={chartGroupOption}
                                onChange={setChartGroupOption}
                                style={{ width: 200 }}
                            >
                                <Option value="Contractors">Contractors</Option>
                                <Option value="Work Type">Work Type</Option>
                            </Select>
                        </div>
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleAddPlanning}
                            loading={saving}
                        >
                            Add
                        </Button>
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

            {/* Modal for 15 days Planning Chart */}
            <Modal
                title="15 Days Planning Chart"
                open={isChartModalOpen}
                onCancel={() => setIsChartModalOpen(false)}
                width={1200}
                footer={[
                    <Button key="close" onClick={() => setIsChartModalOpen(false)}>Close</Button>,
                    <Button key="print" type="primary" onClick={() => generatePDF(plannedWorks, vendors, staff, chartGroupOption, headerDetails)}>Export PDF</Button>
                ]}
            >
                <PlanningChart
                    data={plannedWorks}
                    vendors={vendors}
                    staff={staff}
                    groupOption={chartGroupOption}
                    headerDetails={headerDetails}
                    onDelete={handleDeletePlannedWork}
                />
            </Modal>
        </Layout>
    );
}

function PlanningChart({ data, vendors, staff, groupOption, headerDetails, onDelete }) {
    // Helper to get name
    const getName = (id, list) => {
        if (!id) return '-';
        const item = list.find(x => x._id === (id._id || id));
        return item ? item.name : '-';
    };

    // Extract Header Details
    const siteEngineerName = getName(headerDetails.siteEngineer, staff);
    const inchargeName = getName(headerDetails.incharge, staff);
    const supervisorName = getName(headerDetails.supervisor, staff);

    // Calculate Date Range
    const minDate = headerDetails.startDate ? dayjs(headerDetails.startDate).format('DD/MM/YYYY') : '-';
    const maxDate = headerDetails.endDate ? dayjs(headerDetails.endDate).format('DD/MM/YYYY') : '-';

    const groupedData = {};

    // Grouping Logic
    data.forEach(item => {
        const groupKey = groupOption === 'Contractors'
            ? (vendors.find(v => v._id === (item.contractorId?._id || item.contractorId))?.name || 'Unknown')
            : (item.category || 'Other');

        if (!groupedData[groupKey]) groupedData[groupKey] = [];
        groupedData[groupKey].push(item);
    });

    let grandTotal = 0;

    return (
        <div>
            <Card size="small" style={{ marginBottom: 24, background: '#f5f5f5' }}>
                <Row gutter={[24, 12]}>
                    <Col span={8}>
                        <Typography.Text strong>Date Range: </Typography.Text>
                        <Typography.Text>{minDate} to {maxDate}</Typography.Text>
                    </Col>
                    <Col span={8}>
                        <Typography.Text strong>Site Engineer: </Typography.Text>
                        <Typography.Text>{siteEngineerName || '-'}</Typography.Text>
                    </Col>
                    <Col span={8}>
                        <Typography.Text strong>Incharge: </Typography.Text>
                        <Typography.Text>{inchargeName || '-'}</Typography.Text>
                    </Col>
                    <Col span={8}>
                        <Typography.Text strong>Supervisor: </Typography.Text>
                        <Typography.Text>{supervisorName || '-'}</Typography.Text>
                    </Col>
                </Row>
            </Card>

            {Object.entries(groupedData).map(([groupName, items]) => {
                const subTotal = items.reduce((sum, item) => sum + (item.rate || 0), 0);
                grandTotal += subTotal;

                // Sort items by Work Type -> Building -> Unit
                const sortedItems = [...items].sort((a, b) => {
                    const wtA = a.workType || a.category || '';
                    const wtB = b.workType || b.category || '';
                    if (wtA !== wtB) return wtA.localeCompare(wtB);

                    const bA = a.buildingName || '';
                    const bB = b.buildingName || '';
                    if (bA !== bB) return bA.localeCompare(bB);

                    return (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true });
                });

                const columns = [
                    { title: 'Work Type', dataIndex: 'workType', key: 'workType', render: (text, record) => text || record.category },
                    { title: 'Contractor', key: 'contractor', render: (_, record) => vendors.find(v => v._id === (record.contractorId?._id || record.contractorId))?.name || '-' },
                    { title: 'Date', key: 'date', render: (_, record) => record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : '-' },
                    { title: 'Building', dataIndex: 'buildingName', key: 'building' },
                    { title: 'Unit', dataIndex: 'unitNumber', key: 'unit' },
                    { title: 'Rate', dataIndex: 'rate', key: 'rate', align: 'right', render: (val) => `₹${val || 0}` },
                    {
                        title: 'Action',
                        key: 'action',
                        width: 80,
                        align: 'center',
                        render: (_, record) => (
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => onDelete(record._id)}
                            />
                        )
                    }
                ];
                // Note: EditOutlined is imported at line 3. I should probably import DeleteOutlined if I want a trash icon, or just use text. 
                // Let's check imports. Only EditOutlined is imported. 
                // I'll stick to a simple danger button with "Delete" text or add import if possible. 
                // But I can't easily add import in this large chunk without risking messing up top lines.
                // Actually, I am replacing a huge chunk, so I can see lines 1-3 are NOT in the replacement chunk (StartLine: 387).
                // Wait, the ReplacementContent starts at `const handleDeletePlannedWork...`. 
                // I am replacing from line 387 to 747.
                // Imports are at line 1-11.
                // So I can't easily add DeleteOutlined. 
                // I will usage a generic "Delete" text button for now, or just reuse EditOutlined but that's confusing.
                // Actually, I will use `danger` button with "X".

                return (
                    <div key={groupName} style={{ marginBottom: 32, border: '1px solid #f0f0f0', borderRadius: 8, padding: 16 }}>
                        <h3 style={{ marginBottom: 16 }}>{groupOption}: {groupName}</h3>
                        <Table
                            columns={columns}
                            dataSource={sortedItems}
                            rowKey="_id"
                            pagination={false}
                            size="small"
                            summary={() => (
                                <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                                    <Table.Summary.Cell index={0} colSpan={5} align="right">SubTotal</Table.Summary.Cell>
                                    <Table.Summary.Cell index={1} align="right">₹{subTotal.toFixed(2)}</Table.Summary.Cell>
                                </Table.Summary.Row>
                            )}
                        />
                    </div>
                );
            })}

            <div style={{ marginTop: 24, padding: 16, background: '#1677ff', color: '#fff', borderRadius: 8, textAlign: 'right' }}>
                <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
                    Grand Total: ₹{grandTotal.toFixed(2)}
                </Typography.Title>
            </div>
        </div>
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
