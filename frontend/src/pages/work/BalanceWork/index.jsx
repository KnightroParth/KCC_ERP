import React, { useState, useEffect } from 'react';
import { Layout, Select, Card, Empty, Table, Button, Input } from 'antd';
import { DownloadOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import request from '@/request/request';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';
import { WORK_CATEGORIES } from '@/config/workConfig';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Content } = Layout;
const { Option } = Select;

export default function BalanceWork() {
    const currentProject = useSelector(selectCurrentProject);
    const shouldLockProject = useSelector(selectShouldLockProject);
    const [projects, setProjects] = useState([]);
    const [unitsList, setUnitsList] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(false);

    // Data structures
    const [tableData, setTableData] = useState([]);
    const [activityData, setActivityData] = useState([]);

    useEffect(() => {
        if (shouldLockProject && currentProject?._id) {
            setSelectedProject(currentProject._id);
        }
    }, [shouldLockProject, currentProject]);

    // Fetch initial data (Projects, Units)
    useEffect(() => {
        const fetchInitialData = async () => {
            const projectResult = await request.listAll({ entity: 'project' });
            if (projectResult.success) setProjects(projectResult.result);

            const unitsResult = await request.listAll({ entity: 'units' });
            if (unitsResult.success) setUnitsList(unitsResult.result);
        };
        fetchInitialData();
    }, []);

    // Building Dropdown Logic
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

            // Auto-select building if only one exists
            if (uniqueBuildings.length === 1) {
                setSelectedBuilding(uniqueBuildings[0]);
            }
        } else {
            setBuildings([]);
        }
    }, [selectedProject, unitsList, projects]);

    // Fetch progress / activity data when filters change
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedProject || !selectedBuilding) {
                setTableData([]);
                setActivityData([]);
                return;
            }

            setLoading(true);
            try {
                // 1. Get filtered units for this building
                let buildingUnits = unitsList.filter(u => {
                    const unitProjectId = typeof u.projectId === "object" ? u.projectId._id : u.projectId;
                    const matchesProject = unitProjectId === selectedProject || unitProjectId === (projects.find(p => p._id === selectedProject)?.projectCode);
                    const bName = u.buildingName || u.towerOrWing;
                    return matchesProject && bName === selectedBuilding;
                });

                // Sort units numerically
                buildingUnits.sort((a, b) => {
                    const numA = parseInt(a.unitNumber?.replace(/\D/g, '')) || 0;
                    const numB = parseInt(b.unitNumber?.replace(/\D/g, '')) || 0;
                    return numA - numB;
                });

                // 2. Fetch all activities
                const res = await request.listAll({ entity: 'activities' });
                let allActivities = [];
                if (res.success) {
                    allActivities = res.result || [];
                }

                // 3. Filter activities for this project + building
                let filteredActivities = allActivities.filter(a => {
                    const pId = a.projectId?._id || a.projectId;
                    if (pId !== selectedProject) return false;

                    const unitId = a.unitId?._id || a.unitId;
                    const u = buildingUnits.find(bu => bu._id === unitId);
                    if (!u) return false;

                    return true;
                });

                setActivityData(filteredActivities);

                // 4. Map data exactly to units for the table
                // Gather all tasks across all categories except 'Extra Work' (optional, but requested: combined building-wise)
                // If you want ALL tasks including extra work, just map everything.
                const allTasks = [];
                WORK_CATEGORIES.forEach(cat => {
                    if (cat.fields) {
                        cat.fields.forEach(task => {
                            if (!allTasks.includes(task)) {
                                allTasks.push(task);
                            }
                        });
                    }
                });
                const tasks = allTasks;

                const mappedData = buildingUnits.map(unit => {
                    const row = {
                        key: unit._id,
                        unitId: unit._id,
                        floor: unit.floor ?? unit.floorNumber ?? '-',
                        unitNumber: unit.unitNumber,
                        unitType: unit.unitType || '-',
                    };

                    // For each task, find the progress
                    tasks.forEach(task => {
                        const activity = filteredActivities.find(a =>
                            (a.unitId?._id || a.unitId) === unit._id &&
                            (a.activityName || a.activity) === task
                        );

                        const isExtraWork = task.toLowerCase().includes('extra work');

                        if (activity) {
                            row[task] = activity.progress || '0%';
                        } else {
                            // If it's extra work and there's no activity, it's not applicable
                            row[task] = isExtraWork ? '-' : '0%';
                        }
                    });

                    return row;
                });

                setTableData(mappedData);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedProject, selectedBuilding, unitsList, projects]);


    // Columns definition
    const taskColumnsList = [];
    WORK_CATEGORIES.forEach(cat => {
        if (cat.fields) {
            cat.fields.forEach(task => {
                if (!taskColumnsList.includes(task)) {
                    taskColumnsList.push(task);
                }
            });
        }
    });

    const columns = [
        {
            title: 'Floor',
            dataIndex: 'floor',
            key: 'floor',
            width: 80,
            render: (val) => (val === 0 || val === '0') ? 'G' : (val != null ? val : '-'),
            sorter: (a, b) => {
                const fA = (a.floor === 0 || a.floor === '0') ? 0 : (parseInt(a.floor) || 0);
                const fB = (b.floor === 0 || b.floor === '0') ? 0 : (parseInt(b.floor) || 0);
                return fA - fB;
            }
        },
        {
            title: 'Flat / Unit No.',
            dataIndex: 'unitNumber',
            key: 'unitNumber',
            width: 100,
        },
        {
            title: 'Unit Type',
            dataIndex: 'unitType',
            key: 'unitType',
            width: 120,
        }
    ];

    // Add dynamic task columns grouped by Work Type
    WORK_CATEGORIES.forEach(cat => {
        if (cat.fields && cat.fields.length > 0) {
            const childrenColumns = cat.fields.map(task => {
                return {
                    title: task,
                    dataIndex: task,
                    key: task,
                    align: 'center',
                    width: 120,
                    render: (val) => {
                        let color = '#d9d9d9'; // default grey for 0%
                        if (val === '25%') color = '#ffa940';
                        if (val === '50%') color = '#fadb14';
                        if (val === '75%') color = '#95de64';
                        if (val === '100%') color = '#52c41a';
                        if (val === '-') color = '#bfbfbf'; // light grey for N/A

                        return (
                            <span style={{ color, fontWeight: 'bold' }}>
                                {val || '0%'}
                            </span>
                        );
                    }
                };
            });

            columns.push({
                title: cat.label,
                children: childrenColumns
            });
        }
    });

    // Compute Summaries for Footer
    const calculateTotalFlats = (task) => {
        if (!task) return tableData.length;
        if (task.toLowerCase().includes('extra work')) {
            return tableData.filter(row => row[task] !== '-').length;
        }
        return tableData.length;
    };

    // Returns array of objects with { task, pendingCount }
    const calculatePendingStats = () => {
        const stats = {};
        taskColumnsList.forEach(task => {
            if (task.toLowerCase().includes('extra work')) {
                stats[task] = tableData.filter(row => row[task] !== '-' && row[task] !== '100%').length;
            } else {
                stats[task] = tableData.filter(row => row[task] !== '100%').length;
            }
        });
        return stats;
    };

    const pendingStats = calculatePendingStats();

    const footerRender = () => {
        if (!tableData.length) return null;

        return (
            <div>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'center', fontWeight: 'bold' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: 80 }}></td>
                            <td style={{ width: 100 }}>Total Flat</td>
                            <td style={{ width: 120 }}>{calculateTotalFlats()}</td>
                            {taskColumnsList.map(task => (
                                <td key={`total-${task}`} style={{ width: 120 }}>{calculateTotalFlats(task)}</td>
                            ))}
                        </tr>
                        <tr>
                            <td style={{ width: 80 }}></td>
                            <td style={{ width: 100 }}>Pending Flat</td>
                            <td style={{ width: 120 }}>-</td>
                            {taskColumnsList.map(task => (
                                <td key={`pending-${task}`} style={{ width: 120, color: pendingStats[task] > 0 ? '#ff4d4f' : '#52c41a' }}>
                                    {pendingStats[task]}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };


    // Exports
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        // Prepare Data
        const excelData = tableData.map(row => {
            const obj = {
                'Floor': (row.floor === 0 || row.floor === '0') ? 'G' : (row.floor != null ? row.floor : '-'),
                'Flat': row.unitNumber,
                'Unit Type': row.unitType
            };
            taskColumnsList.forEach(task => {
                obj[task] = row[task] || '0%';
            });
            return obj;
        });

        // Add Summary Rows
        const totalRow = {
            'Floor': 'Total Flat',
            'Flat': '',
            'Unit Type': calculateTotalFlats()
        };
        taskColumnsList.forEach(task => totalRow[task] = calculateTotalFlats(task));
        excelData.push(totalRow);

        const pendingRow = {
            'Floor': 'Pending Flat',
            'Flat': '',
            'Unit Type': ''
        };
        taskColumnsList.forEach(task => pendingRow[task] = pendingStats[task]);
        excelData.push(pendingRow);

        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, "Balance Work");
        XLSX.writeFile(wb, `BalanceWork_${selectedProject?.projectCode || 'Project'}_${selectedBuilding}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF('landscape');

        const projName = currentProject ? currentProject.name : 'Project';

        let isFirstPage = true;

        // Render one table per work category
        WORK_CATEGORIES.forEach(cat => {
            if (!cat.fields || cat.fields.length === 0) return;

            // Check if any unit has data for any task in this category
            const relevantTasks = cat.fields;

            if (!isFirstPage) {
                doc.addPage();
            }
            isFirstPage = false;

            // Page header
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`Project: ${projName} | Building: ${selectedBuilding}`, 14, 12);

            doc.setFontSize(11);
            doc.setTextColor(22, 119, 255);
            doc.text(`Work Type: ${cat.label}`, 14, 20);

            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');

            const tableHeaders = ['Floor', 'Flat', 'Unit Type', ...relevantTasks];

            const tableRows = tableData.map(row => {
                const floorStr = (row.floor === 0 || row.floor === '0') ? 'G' : (row.floor != null ? String(row.floor) : '-');
                return [
                    floorStr,
                    String(row.unitNumber ?? '-'),
                    String(row.unitType ?? '-'),
                    ...relevantTasks.map(task => String(row[task] || '0%'))
                ];
            });

            // Summary rows per category
            const totalRowArr = ['', 'Total Flat', String(tableData.length), ...relevantTasks.map(task => String(calculateTotalFlats(task)))];
            const pendingRowArr = ['', 'Pending Flat', '', ...relevantTasks.map(task => String(pendingStats[task] ?? 0))];
            tableRows.push(totalRowArr);
            tableRows.push(pendingRowArr);

            autoTable(doc, {
                head: [tableHeaders],
                body: tableRows,
                startY: 25,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 2, halign: 'center', overflow: 'linebreak' },
                headStyles: { fillColor: [22, 119, 255], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
                columnStyles: {
                    0: { cellWidth: 14 },
                    1: { cellWidth: 18 },
                    2: { cellWidth: 22 },
                },
                didParseCell: function (data) {
                    if (data.row.index >= tableData.length) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [245, 245, 245];
                        data.cell.styles.textColor = [0, 0, 0];
                    }
                    // Colour code progress values in body
                    if (data.section === 'body' && data.row.index < tableData.length) {
                        const val = data.cell.raw;
                        if (val === '100%') data.cell.styles.textColor = [82, 196, 26];
                        else if (val === '75%') data.cell.styles.textColor = [149, 222, 100];
                        else if (val === '50%') data.cell.styles.textColor = [200, 170, 0];
                        else if (val === '25%') data.cell.styles.textColor = [255, 114, 40];
                        else if (val === '0%') data.cell.styles.textColor = [255, 77, 79];
                    }
                },
                didDrawPage: function (data) {
                    // Re-draw header on continuation pages
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 0, 0);
                    doc.text(`${projName} | ${selectedBuilding} | ${cat.label} (cont.)`, 14, 8);
                    doc.setFont('helvetica', 'normal');
                }
            });
        });

        doc.save(`BalanceWork_${projName}_${selectedBuilding}.pdf`);
    };

    const totalFlatsCount = tableData.length;
    const pendingFlatsCount = tableData.filter(row => {
        let isPending = false;
        taskColumnsList.forEach(task => {
            const val = row[task];
            if (val && val !== '-' && val !== '100%') {
                isPending = true;
            }
        });
        return isPending;
    }).length;

    return (
        <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>
            <Content style={{ padding: '32px 24px' }}>
                <div className="page-content-inner">
                    <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 className="page-title">Balance Work</h1>
                            <p style={{ color: '#8c8c8c' }}>View progress and pending work for units</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Button
                                icon={<FileExcelOutlined />}
                                onClick={exportToExcel}
                                disabled={tableData.length === 0}
                                style={{ color: '#52c41a', borderColor: '#52c41a' }}
                            >
                                Excel
                            </Button>
                            <Button
                                type="primary"
                                icon={<FilePdfOutlined />}
                                onClick={exportToPDF}
                                disabled={tableData.length === 0}
                                danger
                            >
                                PDF
                            </Button>
                        </div>
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
                            placeholder="Select Building"
                            style={{ flex: 1 }}
                            onChange={setSelectedBuilding}
                            disabled={!selectedProject}
                            value={selectedBuilding}
                            allowClear
                        >
                            {buildings.map(b => <Option key={b} value={b}>{b}</Option>)}
                        </Select>
                    </div>

                    <Card bordered={false} bodyStyle={{ padding: 16 }}>
                        {selectedProject && selectedBuilding ? (
                            <>
                                <div style={{ marginBottom: 24, display: 'flex', gap: '32px', padding: '16px', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', color: '#8c8c8c', textTransform: 'uppercase', fontWeight: 600 }}>Grand Total Flats</div>
                                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1677ff', lineHeight: 1.2 }}>{totalFlatsCount}</div>
                                    </div>
                                    <div style={{ width: '1px', background: '#d9d9d9', height: '40px', alignSelf: 'center' }}></div>
                                    <div>
                                        <div style={{ fontSize: '14px', color: '#8c8c8c', textTransform: 'uppercase', fontWeight: 600 }}>Total Pending Flats</div>
                                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#faad14', lineHeight: 1.2 }}>{pendingFlatsCount}</div>
                                    </div>
                                </div>
                                <Table
                                    columns={columns}
                                    dataSource={tableData}
                                    rowKey="key"
                                    loading={loading}
                                    pagination={false}
                                    bordered
                                    size="small"
                                    scroll={{ x: 'max-content', y: 600 }}
                                    footer={footerRender}
                                />
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Empty description="Please select Project and Building to view Balance Work" />
                            </div>
                        )}
                    </Card>
                </div>
            </Content>
        </Layout>
    );
}


