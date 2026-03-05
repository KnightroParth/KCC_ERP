import React, { useState, useEffect } from 'react';
import { Layout, Select, Card, Empty, Typography, Table, Checkbox, Button, Modal, Form, DatePicker, Row, Col, message, Input } from 'antd';
const { TextArea } = Input;
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

import { WORK_CATEGORIES, COMPLEX_TASK_COMPONENTS, SUB_CATEGORY_ALIASES, WORK_TYPE_TO_CONTRACTOR_TYPES } from '@/config/workConfig';
import { assignWork } from '@/request/assignWork';
import request from '@/request/request';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './planning_styles.css';

const { Content } = Layout;
const { Option } = Select;

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

    // Company Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("KCC CONSTRUCTION", 14, 15);

    // Separator Line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, 18, 196, 18);

    // Document Title
    doc.setFontSize(16);
    doc.text("15-DAY WORK PLANNING CHART", 14, 28);

    // Main Info Section (Project & Stats)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Project: ${projectName || '-'}`, 14, 38);
    doc.text(`Generated On: ${dayjs().format('DD MMM YYYY')}`, 196, 38, { align: 'right' });

    // Date Range
    doc.setFont("helvetica", "bold");
    const displayStartDate = headerDetails.startDate ? dayjs(headerDetails.startDate).format('DD MMM YYYY') : '-';
    const displayEndDate = headerDetails.endDate ? dayjs(headerDetails.endDate).format('DD MMM YYYY') : '-';
    doc.text(`${displayStartDate} - ${displayEndDate}`, 14, 45);

    // Personnel Block
    doc.setFont("helvetica", "normal");
    const personnelInfo = `Site Engineer: ${siteEngineerName}  |  Incharge: ${inchargeName}  |  Supervisor: ${supervisorName}`;
    doc.text(personnelInfo, 14, 55);

    // Closing Separator Line
    doc.line(14, 60, 196, 60);

    // RESTORED: Grouping Logic
    const groupedData = {};

    // Strict Date Filtering for PDF
    const filteredData = data.filter(item =>
        dayjs(item.startDate).isSame(headerDetails.startDate, 'day') &&
        dayjs(item.endDate).isSame(headerDetails.endDate, 'day')
    );

    if (groupOption === 'Contractors') {
        // Group by Contractor -> Category
        filteredData.forEach(item => {
            const contractorName = vendors.find(v => v._id === (item.contractorId?._id || item.contractorId))?.name || 'Unknown';
            const category = item.category || 'Other';

            if (!groupedData[contractorName]) groupedData[contractorName] = {};
            if (!groupedData[contractorName][category]) groupedData[contractorName][category] = [];
            groupedData[contractorName][category].push(item);
        });
    } else {
        // Group by Work Type (Category) directly
        filteredData.forEach(item => {
            const groupKey = item.category || 'Other';
            if (!groupedData[groupKey]) groupedData[groupKey] = [];
            groupedData[groupKey].push(item);
        });
    }

    let yPos = 70;

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

                const isExtraWork = categoryName === 'Extra Work';
                const tableBody = items.map(item => {
                    const rate = item.rate || 0;
                    const floor = item.floor || item.floorNumber || '-';
                    const unitType = item.unitType || '-';
                    const row = [
                        item.workType || item.category, // Task Name
                        item.buildingName,
                        unitType,
                        floor,
                        item.unitNumber,
                        rate.toFixed(2)
                    ];
                    if (isExtraWork) row.push(item.description || '-');
                    return row;
                });

                const headRow = ['Task', 'Building', 'Unit Type', 'Floor', 'Unit', 'Rate'];
                if (isExtraWork) headRow.push('Description');

                autoTable(doc, {
                    startY: yPos,
                    head: [headRow],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [22, 119, 255] },
                    columnStyles: {
                        0: { cellWidth: 40 },
                        2: { cellWidth: 25 },
                        3: { halign: 'center' },
                        5: { halign: 'right' },
                        ...(isExtraWork ? { 6: { cellWidth: 40 } } : {}),
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

            const isExtraWork = groupName === 'Extra Work';
            const tableBody = items.map(item => {
                const contractorName = vendors.find(v => v._id === (item.contractorId?._id || item.contractorId))?.name || '-';
                const rate = item.rate || 0;
                const floor = item.floor || item.floorNumber || '-';
                const unitType = item.unitType || '-';
                const row = [
                    item.workType || item.category, // Task Name
                    contractorName,
                    item.buildingName,
                    unitType,
                    floor,
                    item.unitNumber,
                    rate.toFixed(2)
                ];
                if (isExtraWork) row.push(item.description || '-');
                return row;
            });

            // Group Header
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`${groupOption}: ${groupName}`, 14, yPos);
            yPos += 6;

            const headRow = ['Task', 'Contractor', 'Building', 'Unit Type', 'Floor', 'Unit', 'Rate'];
            if (isExtraWork) headRow.push('Description');

            autoTable(doc, {
                startY: yPos,
                head: [headRow],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [22, 119, 255] },
                columnStyles: {
                    0: { cellWidth: 35 },
                    3: { cellWidth: 20 },
                    4: { halign: 'center' },
                    6: { halign: 'right' },
                    ...(isExtraWork ? { 7: { cellWidth: 35 } } : {}),
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

    // Grand Total — use filteredData so only the selected date range is summed
    const grandTotal = filteredData.reduce((sum, item) => sum + (item.rate || 0), 0);
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
    const currentProject = useSelector(selectCurrentProject);
    const shouldLockProject = useSelector(selectShouldLockProject);
    const [projects, setProjects] = useState([]);
    const [unitsList, setUnitsList] = useState([]);
    const [staff, setStaff] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [plannedWorks, setPlannedWorks] = useState([]);
    const [workRates, setWorkRates] = useState([]);
    const [invoices, setInvoices] = useState([]);

    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const [buildings, setBuildings] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);

    useEffect(() => {
        if (shouldLockProject && currentProject?._id) {
            setSelectedProject(currentProject);
        }
    }, [shouldLockProject, currentProject]);
    const [tableData, setTableData] = useState([]);
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [chartGroupOption, setChartGroupOption] = useState('Contractors');
    const [saving, setSaving] = useState(false);
    const [selectedFloor, setSelectedFloor] = useState(null);
    const [extraWorkDescription, setExtraWorkDescription] = useState('');

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

                // Company staff (Site Engineer, Incharge, Supervisor) from Manage Company Staff
                const staffResult = await request.listAll({ entity: 'staff' });
                if (staffResult.success && staffResult.result) setStaff(staffResult.result);

                const vendorResult = await request.listAll({ entity: 'vendor', options: { enabled: true } });
                if (vendorResult.result) setVendors(vendorResult.result);

                const materialResult = await request.listAll({ entity: 'inventory/material' });
                if (materialResult.success) setMaterials(materialResult.result || []);

                const plannedResult = await request.listAll({ entity: 'plannedwork' });
                if (plannedResult.success) setPlannedWorks(plannedResult.result || []);

                const projectIdParam = selectedProject ? ((selectedProject._id ?? selectedProject.id)?.toString?.() ?? selectedProject._id ?? selectedProject.projectCode ?? '') : '';
                const workRateOptions = projectIdParam ? { projectId: projectIdParam } : {};
                const workRateResult = await request.listAll({ entity: 'workrate', options: workRateOptions });
                if (workRateResult.success) setWorkRates(workRateResult.result || []);

                const invoiceResult = await request.listAll({ entity: 'invoice' });
                if (invoiceResult.success) setInvoices(invoiceResult.result || []);

            } catch (error) {
                console.error('Error fetching initial data:', error);
            } finally {
                setLoadingProjects(false);
            }
        };
        fetchData();
    }, [selectedProject]);

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

    // Re-fetch work rates when project changes
    useEffect(() => {
        const fetchWorkRates = async () => {
            if (selectedProject) {
                const projectIdParam = (selectedProject._id ?? selectedProject.id)?.toString?.() ?? selectedProject._id ?? selectedProject.projectCode ?? '';
                const workRateResult = await request.listAll({ entity: 'workrate', options: { projectId: projectIdParam } });
                if (workRateResult.success) setWorkRates(workRateResult.result || []);
            }
        };
        fetchWorkRates();
    }, [selectedProject]);

    // Handle Checkbox Change (Strict Contractor Check)
    // silent = true suppresses per-row toasts (used for bulk select-all)
    const handleCheckboxChange = async (record, taskName, checked, silent = false) => {
        if (!selectedProject || !headerDetails.contractor) {
            if (!silent) message.warning('Please select a project and contractor first');
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

            // STRICT SEARCH: We only show/toggle OUR record for the unit/task/period
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
                if (!silent) message.success(`${taskName} updated`);
            } else {
                if (!silent) message.error('Update Failed');
            }
        } catch (e) {
            console.error(e);
            if (!silent) message.error('An error occurred');
        }
    };

    // Handle Select-All for a column (only toggles rows that are free / not billed or planned)
    const handleSelectAllColumn = async (taskName, checked) => {
        if (!selectedProject || !headerDetails.contractor) {
            message.warning('Please select a project and contractor first');
            return;
        }
        // Only act on rows that are neither billed nor planned (i.e. user-editable rows)
        const editableRows = tableData.filter(row => !row[`${taskName}_isBilled`] && !row[`${taskName}_isPlanned`]);
        if (editableRows.length === 0) return;

        // Optimistically update UI first
        setTableData(prev => prev.map(row => {
            if (!row[`${taskName}_isBilled`] && !row[`${taskName}_isPlanned`]) {
                return { ...row, [taskName]: checked };
            }
            return row;
        }));

        // Fire all API calls silently in parallel — one summary toast at the end
        const results = await Promise.allSettled(
            editableRows.map(row => handleCheckboxChange(row, taskName, checked, true))
        );
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
            message.warning(`${taskName}: ${failed} unit(s) failed to update`);
        } else {
            message.success(`${taskName} ${checked ? 'selected' : 'cleared'} for ${editableRows.length} unit(s)`);
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
        if (!selectedProject || !headerDetails.contractor || !selectedCategory || !headerDetails.startDate || !headerDetails.endDate) {
            message.warning('Please select project, contractor, work type, and date range');
            return;
        }

        // Check for ANY existing planning in this specific interval and building (regardless of contractor)
        const existingPlanning = plannedWorks.some(pw =>
            (pw.projectId?._id === selectedProject._id || pw.projectId === selectedProject._id) &&
            pw.buildingName === selectedBuilding &&
            dayjs(pw.startDate).isSame(headerDetails.startDate, 'day') &&
            dayjs(pw.endDate).isSame(headerDetails.endDate, 'day')
        );

        if (existingPlanning) {
            Modal.confirm({
                title: 'Existing Planning Found',
                content: 'Planning already exists for this date interval in this building. Do you want to update it to match your current selections?',
                okText: 'Yes, Update',
                cancelText: 'No',
                onOk: () => executePlanningSync(),
            });
        } else {
            executePlanningSync();
        }
    };

    const executePlanningSync = async () => {
        setSaving(true);
        try {
            const currentContractorId = typeof headerDetails.contractor === 'object' ? headerDetails.contractor._id : headerDetails.contractor;
            const categoryTasks = selectedCategory.fields || [];

            const promises = [];

            const isExtraWork = selectedCategory.label === 'Extra Work';

            for (const unit of tableData) {
                // If filtering by floor, only sync units on that floor (redundant as tableData is already filtered, but good for safety)
                if (selectedFloor !== null && selectedFloor !== undefined && selectedFloor !== '' && unit.floor !== selectedFloor) continue;

                for (const taskName of categoryTasks) {
                    const isCheckedOnScreen = unit[taskName];
                    const userRate = unit[`${taskName}_rate`];

                    // Find existing record for this unit/task/period (same building, regardless of contractor)
                    const existing = plannedWorks.find(pw =>
                        (pw.projectId?._id === selectedProject._id || pw.projectId === selectedProject._id) &&
                        pw.buildingName === selectedBuilding &&
                        pw.unitNumber === unit.unitNumber &&
                        pw.category === selectedCategory.label &&
                        pw.workType === taskName &&
                        dayjs(pw.startDate).isSame(headerDetails.startDate, 'day') &&
                        dayjs(pw.endDate).isSame(headerDetails.endDate, 'day')
                    );

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

                    if (isCheckedOnScreen) {
                        if (existing) {
                            // UPDATE existing (this replaces contractor if different - "Replacement" logic)
                            const updateData = {
                                rate: finalRate,
                                contractorId: headerDetails.contractor,
                                siteEngineer: headerDetails.siteEngineer,
                                supervisor: headerDetails.supervisor,
                                incharge: headerDetails.incharge,
                                floor: unit.floor,
                                unitType: unit.unitType,
                                description: isExtraWork ? extraWorkDescription : undefined,
                                rateSourceNote: unit[`${taskName}_rateNote`] || undefined
                            };
                            promises.push(request.update({ entity: 'plannedwork', id: existing._id, jsonData: updateData }));
                        } else {
                            // CREATE new
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
                                rate: finalRate,
                                description: isExtraWork ? extraWorkDescription : undefined,
                                rateSourceNote: unit[`${taskName}_rateNote`] || undefined
                            };
                            promises.push(request.create({ entity: 'plannedwork', jsonData: payload }));

                            // Sync Activity
                            const activityData = {
                                projectId: selectedProject._id,
                                unitId: unit._id,
                                contractorId: headerDetails.contractor,
                                activityCode: `PLAN-${Date.now()}-${unit.unitNumber}`,
                                activityName: taskName,
                                category: selectedCategory.label,
                                defaultRate: finalRate,
                                startDate: headerDetails.startDate,
                                endDate: headerDetails.endDate,
                                data: { planned: true }
                            };
                            promises.push(request.create({ entity: 'activities', jsonData: activityData }));
                        }
                    } else if (existing) {
                        // UNCHECKED on screen
                        const existingContractorId = existing.contractorId?._id || existing.contractorId;
                        // ONLY delete if it belonged to the CURRENT contractor
                        // This prevents John from accidentally deleting Salim's records just because John's view is empty
                        if (existingContractorId === currentContractorId) {
                            promises.push(request.delete({ entity: 'plannedwork', id: existing._id }));
                        }
                    }
                }
            }

            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

            if (successful > 0) message.success('Planning synchronized successfully');
            if (failed > 0) message.warning(`${failed} items failed to sync`);

            // Refresh
            const plannedResult = await request.listAll({ entity: 'plannedwork' });
            if (plannedResult.success) setPlannedWorks(plannedResult.result || []);

            const wrProjectId = selectedProject ? ((selectedProject._id ?? selectedProject.id)?.toString?.() ?? selectedProject.projectCode ?? '') : '';
            const workRateResult = await request.listAll({ entity: 'workrate', options: wrProjectId ? { projectId: wrProjectId } : {} });
            if (workRateResult.success) setWorkRates(workRateResult.result || []);

            const invoiceResult = await request.listAll({ entity: 'invoice' });
            if (invoiceResult.success) setInvoices(invoiceResult.result || []);

        } catch (error) {
            console.error('Error synchronizing planning:', error);
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
                let buildingUnits = getBuildingUnits();

                // Apply Floor Filter
                if (selectedFloor !== null && selectedFloor !== undefined && selectedFloor !== '') {
                    buildingUnits = buildingUnits.filter(u => (u.floor ?? u.floorNumber) === selectedFloor);
                }

                const checklistItems = selectedCategory.fields || [];
                const currentContractorId = (headerDetails.contractor?._id || headerDetails.contractor)?.toString();

                // Billed = work finished & invoiced. Red tick should show for ALL contractors if work is billed (anyone did it).
                const billedPWIds = new Set();
                const billedUnitTaskKeys = new Set(); // unitNumber|workType – work is billed by someone (any contractor)
                invoices.forEach(inv => {
                    if (!inv.removed && inv.billingStage !== 'cancelled' && inv.plannedWorkIds) {
                        inv.plannedWorkIds.forEach(pw => {
                            const idStr = (pw?._id || pw)?.toString();
                            if (idStr) billedPWIds.add(idStr);
                            if (pw && typeof pw === 'object' && pw.unitNumber && pw.workType) {
                                billedUnitTaskKeys.add(`${pw.unitNumber}|${pw.workType}`);
                            }
                        });
                    }
                });
                // Derive unit+task keys from plannedWorks for each billed ID (covers case when invoice doesn't populate plannedWorkIds)
                plannedWorks.forEach(pw => {
                    if (billedPWIds.has((pw._id || pw).toString()) && pw.unitNumber && pw.workType) {
                        billedUnitTaskKeys.add(`${pw.unitNumber}|${pw.workType}`);
                    }
                });

                // Work progress 100% (e.g. from old system / Lotus Park at-glance): show tick even if not billed
                const completedUnitTaskKeys = new Set();
                try {
                    const activitiesRes = await request.listAll({
                        entity: 'activities',
                        options: { projectId: selectedProject._id, progress: '100%' }
                    });
                    const completedActivities = activitiesRes?.result || [];
                    completedActivities.forEach((act) => {
                        let unitNumber = act.unitId?.unitNumber;
                        if (unitNumber == null && act.unitId) {
                            const uid = (act.unitId?._id || act.unitId).toString();
                            const u = unitsList.find((x) => (x._id || x).toString() === uid);
                            if (u) unitNumber = u.unitNumber;
                        }
                        const taskName = act.activityName || act.workType;
                        if (unitNumber != null && taskName) {
                            completedUnitTaskKeys.add(`${String(unitNumber)}|${taskName}`);
                        }
                    });
                } catch (_) { /* ignore */ }

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
                        pw.category === selectedCategory.label &&
                        dayjs(pw.startDate).isSame(headerDetails.startDate, 'day') &&
                        dayjs(pw.endDate).isSame(headerDetails.endDate, 'day')
                    );

                    const floorNum = parseInt(unit.floor) || 0;
                    const normalizeCat = (s) => (s ? String(s).replace(/\s+/g, ' ').trim().toLowerCase() : '');
                    const subCategoryMatches = (wrSub, t) => {
                        const a = normalizeCat(wrSub);
                        const b = normalizeCat(t);
                        if (a === b) return true;
                        const aliases = SUB_CATEGORY_ALIASES[t];
                        return aliases && aliases.some((al) => normalizeCat(al) === a);
                    };
                    const unitTypeNorm = (ut) => (ut ? String(ut).replace(/\s+/g, '').replace(/BHK/i, 'BHK') : '');
                    const normalizeBuilding = (b) => (b ? String(b).replace(/[\s-]/g, '').toUpperCase() : '');
                    const selCatNorm = normalizeCat(selectedCategory.label);
                    const selectedBuildingNorm = normalizeBuilding(selectedBuilding);
                    const findWorkRate = (task) => {
                        // 1. Unit-specific match
                        const unitSpecific = workRates.find(wr =>
                            subCategoryMatches(wr.subCategory, task) &&
                            wr.unitNumber === unit.unitNumber
                        );
                        if (unitSpecific) return { rate: unitSpecific.rate, note: unitSpecific.isConsolidated ? unitSpecific.activityNote : null };

                        // 2. Floor/building/unitType match (incl. Other category) – same logic as Set Rate
                        const unitTypeNormVal = unitTypeNorm(unit.unitType);
                        // Helper: check floor + building match regardless of unit type
                        const matchesFloorBuilding = (wr) => {
                            if (normalizeCat(wr.category) !== selCatNorm && normalizeCat(wr.category) !== 'other') return false;
                            if (!subCategoryMatches(wr.subCategory, task)) return false;
                            if (floorNum < (wr.minFloor ?? 0) || floorNum > (wr.maxFloor ?? 100)) return false;
                            if (wr.buildingName) {
                                if (normalizeBuilding(wr.buildingName) !== selectedBuildingNorm) return false;
                            }
                            if (wr.buildingPattern && wr.buildingPattern !== 'AllBuildings' && selectedBuilding && !wr.buildingPattern.includes(selectedBuilding)) return false;
                            return true;
                        };
                        // First pass: exact unit type or 'All' unit type
                        const floorMatch = workRates.find(wr => {
                            if (!matchesFloorBuilding(wr)) return false;
                            const wrUt = unitTypeNorm(wr.unitType);
                            if (unitTypeNormVal && wrUt && wrUt !== unitTypeNormVal && (wrUt || '').toLowerCase() !== 'all') return false;
                            return true;
                        });
                        if (floorMatch) return { rate: floorMatch.rate, note: floorMatch.isConsolidated ? floorMatch.activityNote : null };
                        // Fallback pass: any rate for same building/floor/task regardless of unit type
                        // (mirrors Set Rate behaviour so duplex/mixed-type buildings get rates too)
                        const fallbackMatch = workRates.find(wr => matchesFloorBuilding(wr) && (wr.rate ?? 0) > 0)
                            || workRates.find(wr => matchesFloorBuilding(wr));
                        if (fallbackMatch) return { rate: fallbackMatch.rate, note: null };

                        // 3. Fallback: consolidated bundle (componentActivities)
                        const bundleMatch = workRates.find(wr =>
                            (wr.category === selectedCategory.label || wr.category === 'Other') &&
                            wr.isConsolidated &&
                            Array.isArray(wr.componentActivities) &&
                            wr.componentActivities.some((c) => String(c).trim().toLowerCase() === task.toLowerCase())
                        );
                        if (bundleMatch) {
                            const other = (bundleMatch.componentActivities || []).filter((c) => String(c).trim().toLowerCase() !== task.toLowerCase());
                            return {
                                rate: bundleMatch.rate,
                                note: other.length ? `Includes: ${other.join(', ')}` : `Part of bundle: ${bundleMatch.subCategory}`,
                            };
                        }

                        return { rate: 0, note: null };
                    };

                    const rawFloor = unit.floor != null ? unit.floor : (unit.floorNumber != null ? unit.floorNumber : null);
                    const unitData = {
                        _id: unit._id,
                        unitNumber: unit.unitNumber,
                        floor: rawFloor,
                        unitType: unit.unitType || '-',
                        rate: plannedWork?.rate || 0, // Rate will be task specific now
                    };

                    checklistItems.forEach(item => {
                        // 1. Load Checkbox State (Checklist entity) - CONTRACTOR SPECIFIC
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

                        // 2. Load Rate (PlannedWork entity) - CONTRACTOR SPECIFIC
                        // Also find ANY planning for this task (independent of date) for UI markers
                        const foundPlanned = plannedWorks.find(pw => {
                            const pwProjectId = (pw.projectId?._id || pw.projectId)?.toString();
                            const selProjectId = selectedProject._id?.toString();
                            const pwContractorId = (pw.contractorId?._id || pw.contractorId)?.toString();

                            // Planning Check (Independent of Date) — MUST match building to prevent duplex floor bleed
                            const matchesBasic = pwProjectId === selProjectId &&
                                pw.buildingName === selectedBuilding &&
                                pw.unitNumber === unit.unitNumber &&
                                pw.category === selectedCategory.label &&
                                pw.workType === item;

                            // We only consider it "Found" for checkboxes if it matches the current contractor
                            return matchesBasic && pwContractorId === currentContractorId;
                        });

                        const rateResult = foundPlanned?.rate != null ? { rate: foundPlanned.rate, note: foundPlanned.rateSourceNote } : findWorkRate(item);
                        unitData[`${item}_rate`] = rateResult?.rate ?? 0;
                        unitData[`${item}_rateNote`] = rateResult?.note ?? null;

                        // 3. Flags for coloring & locking (Independent of Date)
                        if (foundPlanned) {
                            unitData[`${item}_isPlanned`] = true;
                            if (foundPlanned.description === "Carry Forwarded because not completed within time") {
                                unitData[`${item}_isCarryForwarded`] = true;
                            }
                        }

                        // Red tick = work finished: either billed OR 100% progress OR project Complete (building done, no remaining work).
                        const unitTaskKey = `${unit.unitNumber}|${item}`;
                        const projectComplete = selectedProject?.status === 'Complete';
                        if (projectComplete || billedUnitTaskKeys.has(unitTaskKey) || completedUnitTaskKeys.has(unitTaskKey) || (foundPlanned && billedPWIds.has(foundPlanned._id?.toString()))) {
                            unitData[`${item}_isBilled`] = true;
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
    }, [selectedProject, selectedBuilding, selectedCategory, headerDetails.contractor, headerDetails.startDate, headerDetails.endDate, plannedWorks, selectedFloor, workRates, invoices, unitsList]);

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
                        {shouldLockProject && currentProject ? (
                            <Input
                                readOnly
                                disabled
                                style={{ flex: 1, minWidth: 200, color: 'rgba(0,0,0,0.88)', cursor: 'not-allowed' }}
                                value={currentProject.projectCode ? `${currentProject.name} (${currentProject.projectCode})` : currentProject.name}
                            />
                        ) : (
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
                        )}

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
                            onChange={(val) => {
                                setSelectedCategory(WORK_CATEGORIES.find(c => c.id === val));
                                // Clear floor and description when work type changes
                                setSelectedFloor(null);
                                setExtraWorkDescription('');
                            }}
                            disabled={!selectedProject || !selectedBuilding}
                            value={selectedCategory?.id}
                        >
                            {WORK_CATEGORIES.map(c => <Option key={c.id} value={c.id}>{c.label}</Option>)}
                        </Select>

                        <Select
                            placeholder="Select Floor"
                            style={{ flex: 1, minWidth: 150 }}
                            onChange={setSelectedFloor}
                            disabled={!selectedProject || !selectedBuilding}
                            value={selectedFloor}
                            allowClear
                        >
                            {[...new Set(getBuildingUnits().map(u => u.floor ?? u.floorNumber).filter(f => f != null && f !== ''))].sort((a, b) => parseInt(a) - parseInt(b)).map(f => (
                                <Option key={f} value={f}>{(f === 0 || f === '0') ? 'G' : f}</Option>
                            ))}
                        </Select>
                    </div>

                    {selectedCategory?.label === 'Extra Work' && (
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ marginBottom: 8, fontWeight: 500 }}>Extra Work Description</div>
                            <TextArea
                                rows={3}
                                placeholder="Enter details of extra work..."
                                value={extraWorkDescription}
                                onChange={(e) => setExtraWorkDescription(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Global Header Inputs */}
                    {selectedProject && (
                        <Card bordered={false} style={{ marginBottom: 24 }} size="small">
                            <Row gutter={[16, 16]}>
                                <Col span={3}>
                                    <div style={{ marginBottom: 4, fontWeight: 500 }}>Start Date</div>
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        value={headerDetails.startDate}
                                        onChange={(date) => setHeaderDetails(prev => ({ ...prev, startDate: date }))}
                                    />
                                </Col>
                                <Col span={3}>
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
                                        placeholder="Select Site Engineer"
                                        showSearch
                                        optionFilterProp="label"
                                        options={staff.filter(s => s.role === 'site_engineer' || s.designation === 'Site Engineer').map(s => ({ label: s.name, value: s._id }))}
                                        value={headerDetails.siteEngineer}
                                        onChange={(val) => setHeaderDetails(prev => ({ ...prev, siteEngineer: val }))}
                                    />
                                </Col>
                                <Col span={4}>
                                    <div style={{ marginBottom: 4, fontWeight: 500 }}>Supervisor</div>
                                    <Select
                                        style={{ width: '100%' }}
                                        placeholder="Select Supervisor"
                                        showSearch
                                        optionFilterProp="label"
                                        options={staff.filter(s => s.role === 'planner' || s.designation === 'Site Incharge').map(s => ({ label: s.name, value: s._id }))}
                                        value={headerDetails.supervisor}
                                        onChange={(val) => setHeaderDetails(prev => ({ ...prev, supervisor: val }))}
                                    />
                                </Col>
                                <Col span={4}>
                                    <div style={{ marginBottom: 4, fontWeight: 500 }}>Incharge</div>
                                    <Select
                                        style={{ width: '100%' }}
                                        placeholder="Select Incharge"
                                        showSearch
                                        optionFilterProp="label"
                                        options={staff.filter(s => s.role === 'planner' || s.designation === 'Site Incharge').map(s => ({ label: s.name, value: s._id }))}
                                        value={headerDetails.incharge}
                                        onChange={(val) => setHeaderDetails(prev => ({ ...prev, incharge: val }))}
                                    />
                                </Col>
                                <Col span={6}>
                                    <div style={{ marginBottom: 4, fontWeight: 500 }}>Contractor</div>
                                    <Select
                                        style={{ width: '100%' }}
                                        placeholder="Select"
                                        showSearch
                                        optionFilterProp="label"
                                        options={(() => {
                                            const categoryLabel = selectedCategory?.label;
                                            // If no work type selected, or Extra Work (null mapping) -> show all
                                            if (!categoryLabel) return vendors.map(v => ({ label: `${v.name} - ${v.workType || 'General'}`, value: v._id }));
                                            const allowedTypes = WORK_TYPE_TO_CONTRACTOR_TYPES[categoryLabel];
                                            if (allowedTypes === null || allowedTypes === undefined) {
                                                // null = Extra Work or unmapped = show all
                                                return vendors.map(v => ({ label: `${v.name} - ${v.workType || 'General'}`, value: v._id }));
                                            }
                                            const normalise = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
                                            const allowedNorm = allowedTypes.map(normalise);
                                            return vendors
                                                .filter(v => allowedNorm.includes(normalise(v.workType)))
                                                .map(v => ({ label: `${v.name} - ${v.workType || 'General'}`, value: v._id }));
                                        })()}
                                        value={headerDetails.contractor}
                                        onChange={(val) => setHeaderDetails(prev => ({ ...prev, contractor: val }))}
                                        popupMatchSelectWidth={false}
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
                                onSelectAllColumn={handleSelectAllColumn}
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

    // Strict Date Filtering for Chart
    const filteredData = data.filter(item =>
        dayjs(item.startDate).isSame(headerDetails.startDate, 'day') &&
        dayjs(item.endDate).isSame(headerDetails.endDate, 'day')
    );

    // Grouping Logic
    if (groupOption === 'Contractors') {
        filteredData.forEach(item => {
            const contractorName = vendors.find(v => v._id === (item.contractorId?._id || item.contractorId))?.name || 'Unknown';
            const category = item.category || 'Other';

            if (!groupedData[contractorName]) groupedData[contractorName] = {};
            if (!groupedData[contractorName][category]) groupedData[contractorName][category] = [];
            groupedData[contractorName][category].push(item);
        });
    } else {
        filteredData.forEach(item => {
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
                                    render: (val) => (val === 0 || val === '0') ? 'G' : (val != null ? val : '-'),
                                    sorter: (a, b) => {
                                        const fA = (a.floor === 0 || a.floor === '0') ? 0 : (parseInt(a.floor) || 0);
                                        const fB = (b.floor === 0 || b.floor === '0') ? 0 : (parseInt(b.floor) || 0);
                                        return fA - fB;
                                    }
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
                                ...(categoryName === 'Extra Work' ? [{
                                    title: 'Description',
                                    dataIndex: 'description',
                                    key: 'description',
                                    render: (val) => val || '-'
                                }] : []),
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
                            render: (val) => (val === 0 || val === '0') ? 'G' : (val != null ? val : '-'),
                            sorter: (a, b) => {
                                const fA = (a.floor === 0 || a.floor === '0') ? 0 : (parseInt(a.floor) || 0);
                                const fB = (b.floor === 0 || b.floor === '0') ? 0 : (parseInt(b.floor) || 0);
                                return fA - fB;
                            }
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
                        ...(groupName === 'Extra Work' ? [{
                            title: 'Description',
                            dataIndex: 'description',
                            key: 'description',
                            render: (val) => val || '-'
                        }] : []),
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

function PlanningTable({ data, category, onCheckChange, onRateChange, onSelectAllColumn, disabled }) {
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
            render: (val) => (val === 0 || val === '0') ? 'G' : (val != null ? val : '-'),
            sorter: (a, b) => {
                const fA = (a.floor === 0 || a.floor === '0') ? 0 : (parseInt(a.floor) || 0);
                const fB = (b.floor === 0 || b.floor === '0') ? 0 : (parseInt(b.floor) || 0);
                return fA - fB;
            },
        },
        {
            title: 'Unit Type',
            dataIndex: 'unitType',
            key: 'unitType',
            width: 120,
            sorter: (a, b) => (a.unitType || '').localeCompare(b.unitType || ''),
        },

        ...checklist.flatMap((taskName, index) => {
            // Editable rows for this task = not billed, not planned
            const editableRows = data.filter(row => !row[`${taskName}_isBilled`] && !row[`${taskName}_isPlanned`]);
            const allEditable = editableRows.length > 0 && editableRows.every(row => row[taskName]);
            const someEditable = !allEditable && editableRows.some(row => row[taskName]);

            return [
                {
                    title: (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <Checkbox
                                checked={allEditable}
                                indeterminate={someEditable}
                                disabled={disabled || editableRows.length === 0}
                                onChange={e => onSelectAllColumn && onSelectAllColumn(taskName, e.target.checked)}
                            />
                            <span style={{ fontSize: 11, textAlign: 'center', lineHeight: '1.2' }}>{taskName}</span>
                        </div>
                    ),
                    dataIndex: taskName,
                    key: `item-${index}`,
                    width: 100,
                    align: 'center',
                    render: (checked, record) => {
                        const isBilled = record[`${taskName}_isBilled`];
                        const isPlanned = record[`${taskName}_isPlanned`];

                        if (isBilled) {
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Checkbox checked={true} disabled style={{ color: '#FF0000' }} className="billed-checkbox" />
                                </div>
                            );
                        }
                        if (isPlanned) {
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                    <Checkbox checked={true} disabled style={{ color: '#008000' }} className="planned-checkbox" />
                                    {record[`${taskName}_isCarryForwarded`] && (
                                        <span style={{ fontSize: '10px', color: '#fa8c16', lineHeight: 1, textAlign: 'center' }}>Carry<br />Forwarded</span>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <Checkbox
                                    checked={checked || false}
                                    onChange={(e) => onCheckChange(record, taskName, e.target.checked)}
                                    disabled={disabled}
                                />
                                {record[`${taskName}_isCarryForwarded`] && (
                                    <span style={{ fontSize: '10px', color: '#fa8c16', lineHeight: 1, textAlign: 'center' }}>Carry<br />Forwarded</span>
                                )}
                            </div>
                        );
                    },
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
            ];
        }),
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
