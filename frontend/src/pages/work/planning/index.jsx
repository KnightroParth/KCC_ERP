import React, { useState, useEffect } from 'react';
import { Layout, Select, Card, Empty, Typography, Table, Checkbox, Button, Modal, Form, DatePicker, Row, Col, message, Input } from 'antd';
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

function generatePDF(data, vendors, staff, groupOption, headerDetails, projectName) {
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

    doc.text(`Project: ${projectName || '-'}`, 14, 36);
    doc.text(`Site Engineer: ${siteEngineerName}`, 14, 42);
    doc.text(`Incharge: ${inchargeName}`, 14, 48);
    doc.text(`Supervisor: ${supervisorName}`, 14, 54);

    // Grouping Logic
    const groupedData = {};

    if (groupOption === 'Contractors') {
        // Group by Contractor -> Category
        data.forEach(item => {
            const contractorName = vendors.find(v => v._id === (item.contractorId?._id || item.contractorId))?.name || 'Unknown';
            const category = item.category || 'Other';

            if (!groupedData[contractorName]) groupedData[contractorName] = {};
            if (!groupedData[contractorName][category]) groupedData[contractorName][category] = [];
            groupedData[contractorName][category].push(item);
        });
    } else {
        // Group by Work Type (Category) directly
        data.forEach(item => {
            const groupKey = item.category || 'Other';
            if (!groupedData[groupKey]) groupedData[groupKey] = [];
            groupedData[groupKey].push(item);
        });
    }

    let yPos = 60;

    let isFirstContractor = true;
    if (groupOption === 'Contractors') {
        Object.entries(groupedData).forEach(([contractorName, categories]) => {
            if (!isFirstContractor) {
                doc.addPage();
                yPos = 20;
            }
            isFirstContractor = false;

            // Re-draw Header on new page for specific contractor if needed, 
            // but at minimum we need the Contractor Header
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(`Contractor: ${contractorName}`, 14, yPos);
            yPos += 10;

            Object.entries(categories).forEach(([categoryName, items]) => {
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

                // Category Header
                doc.setFontSize(12);
                doc.setTextColor(22, 119, 255); // Blue color for category
                doc.text(categoryName, 14, yPos);
                yPos += 6;

                const tableBody = items.map(item => {
                    const rate = item.rate || 0;
                    const floor = item.floor || item.floorNumber || '-';
                    const unitType = item.unitType || '-';
                    return [
                        item.workType || item.category, // Task Name
                        item.buildingName,
                        unitType,
                        floor,
                        item.unitNumber,
                        rate.toFixed(2)
                    ];
                });

                autoTable(doc, {
                    startY: yPos,
                    head: [['Task', 'Building', 'Unit Type', 'Floor', 'Unit', 'Rate']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [22, 119, 255] },
                    columnStyles: {
                        0: { cellWidth: 50 },
                        2: { cellWidth: 30 },
                        3: { halign: 'center' },
                        5: { halign: 'right' },
                    },
                    didDrawPage: (data) => {
                        yPos = data.cursor.y;
                    }
                });

                // Subtotal for Category
                const subTotal = items.reduce((sum, item) => sum + (item.rate || 0), 0);
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.text(`SubTotal (${categoryName}): ${subTotal.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 6);
                yPos = doc.lastAutoTable.finalY + 16;

                // Add page if needed within same contractor
                if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                }
            });
        });
    } else {
        // Work Type Grouping (Flat list of categories)
        Object.entries(groupedData).forEach(([groupName, items]) => {
            // Sort items by Building -> Unit
            items.sort((a, b) => {
                const bA = a.buildingName || '';
                const bB = b.buildingName || '';
                if (bA !== bB) return bA.localeCompare(bB);
                return (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true });
            });

            const tableBody = items.map(item => {
                const contractorName = vendors.find(v => v._id === (item.contractorId?._id || item.contractorId))?.name || '-';
                const rate = item.rate || 0;
                const floor = item.floor || item.floorNumber || '-';
                const unitType = item.unitType || '-';
                return [
                    item.workType || item.category, // Task Name
                    contractorName,
                    item.buildingName,
                    unitType,
                    floor,
                    item.unitNumber,
                    rate.toFixed(2)
                ];
            });

            // Group Header
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`${groupOption}: ${groupName}`, 14, yPos);
            yPos += 6;

            autoTable(doc, {
                startY: yPos,
                head: [['Task', 'Contractor', 'Building', 'Unit Type', 'Floor', 'Unit', 'Rate']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [22, 119, 255] },
                columnStyles: {
                    0: { cellWidth: 45 },
                    3: { cellWidth: 25 },
                    4: { halign: 'center' },
                    6: { halign: 'right' },
                },
                didDrawPage: (data) => {
                    yPos = data.cursor.y;
                }
            });

            // Subtotal
            const subTotal = items.reduce((sum, item) => sum + (item.rate || 0), 0);
            doc.setFontSize(10);
            doc.text(`SubTotal: ${subTotal.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
            yPos = doc.lastAutoTable.finalY + 20;

            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
        });
    }

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
            // Find if a checklist entry already exists for this unit, task, contractor AND DATES
            const res = await request.listAll({
                entity: 'checklist',
                options: {
                    projectId: selectedProject._id,
                    unitNumber: record.unitNumber,
                    type: taskName,
                    'personnel.contractor': currentContractorId,
                    startDate: headerDetails.startDate ? headerDetails.startDate.toISOString() : undefined,
                    endDate: headerDetails.endDate ? headerDetails.endDate.toISOString() : undefined
                }
            });

            // STRICT FILTERING: Ensure we only update the record that matches OUR contractor and dates
            const existingRecord = res.result?.find(r => {
                const rContractorId = r.personnel?.contractor?._id || r.personnel?.contractor;
                const sameDates = dayjs(r.startDate).isSame(headerDetails.startDate, 'day') &&
                    dayjs(r.endDate).isSame(headerDetails.endDate, 'day');
                return rContractorId === currentContractorId && sameDates;
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

    const handleRateChange = (id, taskName, value) => {
        setTableData(prev => prev.map(row => {
            if (row._id === id) {
                return { ...row, [`${taskName}_rate`]: value };
            }
            return row;
        }));
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
                const currentContractorId = typeof headerDetails.contractor === 'object' ? headerDetails.contractor._id : headerDetails.contractor;
                // Find which specific tasks are checked for this unit
                const checkedTasks = Object.entries(unit).filter(([key, val]) => val === true && key !== 'unitNumber' && key !== '_id').map(([key]) => key);

                for (const taskName of checkedTasks) {
                    // Check for existing planned work matching project, unit, category, task, contractor AND DATES
                    const existing = plannedWorks.find(pw =>
                        (pw.projectId?._id === selectedProject._id || pw.projectId === selectedProject._id) &&
                        pw.unitNumber === unit.unitNumber &&
                        pw.category === selectedCategory.label &&
                        pw.workType === taskName &&
                        (pw.contractorId?._id || pw.contractorId) === currentContractorId &&
                        dayjs(pw.startDate).isSame(headerDetails.startDate, 'day') &&
                        dayjs(pw.endDate).isSame(headerDetails.endDate, 'day')
                    );

                    // Rate calculation moved here to be available for both Update and Create
                    const userRate = unit[`${taskName}_rate`];
                    let finalRate = 0;
                    if (userRate !== undefined && userRate !== null && userRate !== '') {
                        finalRate = parseFloat(userRate);
                    } else {
                        const material = materials.find(m =>
                            m.name.toLowerCase().includes(taskName.toLowerCase()) ||
                            m.category?.toLowerCase() === selectedCategory.label.toLowerCase()
                        );
                        finalRate = material ? material.price || 0 : 0;
                    }

                    if (existing) {
                        // UPDATE existing record logic
                        const updateData = {
                            rate: finalRate,
                            startDate: headerDetails.startDate,
                            endDate: headerDetails.endDate,
                            siteEngineer: headerDetails.siteEngineer,
                            supervisor: headerDetails.supervisor,
                            incharge: headerDetails.incharge,
                            floor: unit.floor,
                            unitType: unit.unitType
                        };
                        promises.push(request.update({ entity: 'plannedwork', id: existing._id, jsonData: updateData }));
                    } else {
                        // CREATE new record logic
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
                            floor: unit.floor,
                            unitType: unit.unitType,
                            rate: finalRate
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
                            defaultRate: finalRate,
                            data: { planned: true }
                        };
                        promises.push(request.create({ entity: 'activities', jsonData: activityData }));
                    }
                }
            }

            // Execute all requests and handle individually
            const results = await Promise.allSettled(promises);

            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

            if (successful > 0) {
                message.success(`${successful} items added successfully`);
            }
            if (failed > 0) {
                // Log details for debugging
                console.error('Failed items:', results.filter(r => r.status === 'rejected' || !r.value.success));
                message.warning(`${failed} items failed to add (duplicates or network error)`);
            }

            // Refresh planned works if at least one succeeded
            if (successful > 0) {
                const plannedResult = await request.listAll({ entity: 'plannedwork' });
                if (plannedResult.success) setPlannedWorks(plannedResult.result || []);
            }

        } catch (error) {
            console.error('Error adding planning:', error);
            message.error('Critical error: ' + error.message);
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
            if (selectedProject && selectedBuilding && selectedCategory && headerDetails.contractor && headerDetails.startDate && headerDetails.endDate) {
                const buildingUnits = getBuildingUnits();
                const checklistItems = selectedCategory.fields || [];
                const currentContractorId = typeof headerDetails.contractor === 'object' ? headerDetails.contractor._id : headerDetails.contractor;

                // Fetch checklists for this project, contractor, and specific date range
                const res = await request.listAll({
                    entity: 'checklist',
                    options: {
                        projectId: selectedProject._id,
                        'personnel.contractor': currentContractorId,
                        startDate: headerDetails.startDate.toISOString(),
                        endDate: headerDetails.endDate.toISOString()
                    }
                });

                const existingChecklists = res.result || [];

                const data = buildingUnits.map(unit => {
                    // Find rate from materials or plannedWorks
                    const plannedWork = plannedWorks.find(pw =>
                        (pw.projectId?._id === selectedProject._id || pw.projectId === selectedProject._id) &&
                        pw.unitNumber === unit.unitNumber &&
                        pw.category === selectedCategory.label
                    );

                    const material = materials.find(m =>
                        m.category?.toLowerCase() === selectedCategory.label.toLowerCase()
                    );

                    const unitData = {
                        _id: unit._id,
                        unitNumber: unit.unitNumber,
                        floor: unit.floor || unit.floorNumber || '-',
                        unitType: unit.unitType || '-',
                        rate: plannedWork?.rate || material?.price || 0,
                    };

                    checklistItems.forEach(item => {
                        // 1. Load Checkbox State (Checklist entity) - FILTER BY CONTRACTOR AND DATES
                        const foundCheck = existingChecklists.find(c => {
                            const cContractorId = c.personnel?.contractor?._id || c.personnel?.contractor;
                            const isSameRange = dayjs(c.startDate).isSame(headerDetails.startDate, 'day') &&
                                dayjs(c.endDate).isSame(headerDetails.endDate, 'day');
                            return c.unitNumber === unit.unitNumber &&
                                c.type === item &&
                                cContractorId === currentContractorId &&
                                isSameRange;
                        });

                        if (foundCheck) {
                            if (foundCheck.data?.checked !== undefined) {
                                unitData[item] = foundCheck.data.checked;
                            } else if (foundCheck.data?.rows) {
                                unitData[item] = foundCheck.data.rows.length > 0;
                            } else {
                                unitData[item] = true;
                            }
                        } else {
                            unitData[item] = false;
                        }

                        // 2. Load Rate (PlannedWork entity) - FILTER BY CONTRACTOR AND DATES
                        const foundPlanned = plannedWorks.find(pw =>
                            (pw.projectId?._id === selectedProject._id || pw.projectId === selectedProject._id) &&
                            pw.unitNumber === unit.unitNumber &&
                            pw.category === selectedCategory.label &&
                            pw.workType === item &&
                            (pw.contractorId?._id || pw.contractorId) === currentContractorId &&
                            dayjs(pw.startDate).isSame(headerDetails.startDate, 'day') &&
                            dayjs(pw.endDate).isSame(headerDetails.endDate, 'day')
                        );

                        unitData[`${item}_rate`] = foundPlanned?.rate || material?.price || 0;
                    });

                    return unitData;
                });
                setTableData(data);
            } else {
                setTableData([]);
            }
        };
        fetchChecklistStates();
    }, [selectedProject, selectedBuilding, selectedCategory, headerDetails.contractor, headerDetails.startDate, headerDetails.endDate, plannedWorks]);

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
                                disabled={!headerDetails.startDate || !headerDetails.endDate || !headerDetails.siteEngineer || !headerDetails.supervisor || !headerDetails.incharge}
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
                                onRateChange={handleRateChange}
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
                    <Button key="print" type="primary" onClick={() => generatePDF(plannedWorks, vendors, staff, chartGroupOption, headerDetails, selectedProject?.name)}>Export PDF</Button>
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
    if (groupOption === 'Contractors') {
        data.forEach(item => {
            const contractorName = vendors.find(v => v._id === (item.contractorId?._id || item.contractorId))?.name || 'Unknown';
            const category = item.category || 'Other';

            if (!groupedData[contractorName]) groupedData[contractorName] = {};
            if (!groupedData[contractorName][category]) groupedData[contractorName][category] = [];
            groupedData[contractorName][category].push(item);
        });
    } else {
        data.forEach(item => {
            const groupKey = item.category || 'Other';
            if (!groupedData[groupKey]) groupedData[groupKey] = [];
            groupedData[groupKey].push(item);
        });
    }

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

            {groupOption === 'Contractors' ? (
                Object.entries(groupedData).map(([contractorName, categories]) => (
                    <div key={contractorName} style={{ marginBottom: 32, border: '1px solid #d9d9d9', borderRadius: 8, padding: 16 }}>
                        <Typography.Title level={4} style={{ marginTop: 0 }}>Contractor: {contractorName}</Typography.Title>

                        {Object.entries(categories).map(([categoryName, items]) => {
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
                                {
                                    title: 'Work Type',
                                    dataIndex: 'workType',
                                    key: 'workType',
                                    render: (text, record) => text || record.category,
                                    sorter: (a, b) => (a.workType || a.category || '').localeCompare(b.workType || b.category || '')
                                },
                                {
                                    title: 'Building',
                                    dataIndex: 'buildingName',
                                    key: 'building',
                                    sorter: (a, b) => (a.buildingName || '').localeCompare(b.buildingName || '')
                                },
                                {
                                    title: 'Unit Type',
                                    dataIndex: 'unitType',
                                    key: 'unitType',
                                    render: (val) => val || '-',
                                    sorter: (a, b) => (a.unitType || '').localeCompare(b.unitType || '')
                                },
                                {
                                    title: 'Floor',
                                    dataIndex: 'floor',
                                    key: 'floor',
                                    align: 'center',
                                    render: (val) => val || '-',
                                    sorter: (a, b) => (a.floor || '').localeCompare(b.floor || '', undefined, { numeric: true })
                                },
                                {
                                    title: 'Unit',
                                    dataIndex: 'unitNumber',
                                    key: 'unit',
                                    sorter: (a, b) => (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true })
                                },
                                {
                                    title: 'Rate',
                                    dataIndex: 'rate',
                                    key: 'rate',
                                    align: 'right',
                                    render: (val) => `₹${val || 0}`,
                                    sorter: (a, b) => (a.rate || 0) - (b.rate || 0)
                                },
                                {
                                    title: 'Action',
                                    key: 'action',
                                    width: 80,
                                    align: 'center',
                                    render: (_, record) => (
                                        <Button
                                            type="primary"
                                            danger
                                            ghost
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            onClick={() => onDelete(record._id)}
                                        />
                                    )
                                }
                            ];

                            return (
                                <div key={categoryName} style={{ marginBottom: 24, paddingLeft: 16, borderLeft: '4px solid #1677ff' }}>
                                    <h4 style={{ color: '#1677ff', marginBottom: 8 }}>{categoryName}</h4>
                                    <Table
                                        columns={columns}
                                        dataSource={sortedItems}
                                        rowKey="_id"
                                        pagination={false}
                                        size="small"
                                        summary={() => (
                                            <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                                                <Table.Summary.Cell index={0} colSpan={3} align="right">SubTotal ({categoryName})</Table.Summary.Cell>
                                                <Table.Summary.Cell index={1} align="right">₹{subTotal.toFixed(2)}</Table.Summary.Cell>
                                                <Table.Summary.Cell index={2} />
                                            </Table.Summary.Row>
                                        )}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ))
            ) : (
                Object.entries(groupedData).map(([groupName, items]) => {
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
                        {
                            title: 'Work Type',
                            dataIndex: 'workType',
                            key: 'workType',
                            render: (text, record) => text || record.category,
                            sorter: (a, b) => (a.workType || a.category || '').localeCompare(b.workType || b.category || '')
                        },
                        {
                            title: 'Contractor',
                            key: 'contractor',
                            render: (_, record) => vendors.find(v => v._id === (record.contractorId?._id || record.contractorId))?.name || '-',
                            sorter: (a, b) => {
                                const nameA = vendors.find(v => v._id === (a.contractorId?._id || a.contractorId))?.name || '';
                                const nameB = vendors.find(v => v._id === (b.contractorId?._id || b.contractorId))?.name || '';
                                return nameA.localeCompare(nameB);
                            }
                        },
                        {
                            title: 'Building',
                            dataIndex: 'buildingName',
                            key: 'building',
                            sorter: (a, b) => (a.buildingName || '').localeCompare(b.buildingName || '')
                        },
                        {
                            title: 'Unit Type',
                            dataIndex: 'unitType',
                            key: 'unitType',
                            render: (val) => val || '-',
                            sorter: (a, b) => (a.unitType || '').localeCompare(b.unitType || '')
                        },
                        {
                            title: 'Floor',
                            dataIndex: 'floor',
                            key: 'floor',
                            align: 'center',
                            render: (val) => val || '-',
                            sorter: (a, b) => (a.floor || '').localeCompare(b.floor || '', undefined, { numeric: true })
                        },
                        {
                            title: 'Unit',
                            dataIndex: 'unitNumber',
                            key: 'unit',
                            sorter: (a, b) => (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true })
                        },
                        {
                            title: 'Rate',
                            dataIndex: 'rate',
                            key: 'rate',
                            align: 'right',
                            render: (val) => `₹${val || 0}`,
                            sorter: (a, b) => (a.rate || 0) - (b.rate || 0)
                        },
                        {
                            title: 'Action',
                            key: 'action',
                            width: 80,
                            align: 'center',
                            render: (_, record) => (
                                <Button
                                    type="primary"
                                    danger
                                    ghost
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={() => onDelete(record._id)}
                                />
                            )
                        }
                    ];

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
                                        <Table.Summary.Cell index={0} colSpan={4} align="right">SubTotal</Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="right">₹{subTotal.toFixed(2)}</Table.Summary.Cell>
                                        <Table.Summary.Cell index={2} />
                                    </Table.Summary.Row>
                                )}
                            />
                        </div>
                    );
                })
            )}

            <div style={{ marginTop: 24, padding: 16, background: '#1677ff', color: '#fff', borderRadius: 8, textAlign: 'right' }}>
                <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
                    Grand Total: ₹{grandTotal.toFixed(2)}
                </Typography.Title>
            </div>
        </div>
    );
}

function PlanningTable({ data, category, onCheckChange, onRateChange, disabled }) {
    const checklist = category?.fields || [];

    const columns = [
        {
            title: 'Flat / Unit No.',
            dataIndex: 'unitNumber',
            key: 'unitNumber',
            width: 120,
            fixed: 'left',
            render: (text) => <strong>{text}</strong>,
            sorter: (a, b) => (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true }),
        },
        {
            title: 'Floor',
            dataIndex: 'floor',
            key: 'floor',
            width: 80,
            align: 'center',
            sorter: (a, b) => (a.floor || '').localeCompare(b.floor || '', undefined, { numeric: true }),
        },
        {
            title: 'Unit Type',
            dataIndex: 'unitType',
            key: 'unitType',
            width: 120,
            sorter: (a, b) => (a.unitType || '').localeCompare(b.unitType || ''),
        },

        ...checklist.flatMap((taskName, index) => [
            {
                title: taskName,
                dataIndex: taskName,
                key: `item-${index}`,
                width: 100,
                align: 'center',
                render: (checked, record) => (
                    <Checkbox
                        checked={checked || false}
                        onChange={(e) => onCheckChange(record, taskName, e.target.checked)}
                        disabled={disabled}
                    />
                ),
            },
            {
                title: 'Rate',
                key: `rate-${index}`,
                width: 100,
                align: 'right',
                render: (_, record) => (
                    <Input
                        placeholder="0"
                        style={{ width: '100%', textAlign: 'right' }}
                        size="small"
                        value={record[`${taskName}_rate`]}
                        onChange={(e) => {
                            if (onRateChange) {
                                onRateChange(record._id, taskName, e.target.value);
                            }
                        }}
                    />
                ),
            }
        ]),
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
