// frontend/src/pages/work/SetRate/index.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Select, Card, Table, InputNumber, Row, Col, message, Typography, Button, Space } from 'antd';
import { useSelector } from 'react-redux';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';
import request from '@/request/request';
import { assignWork } from '@/request/assignWork';
import { WORK_CATEGORIES, SUB_CATEGORY_ALIASES } from '@/config/workConfig';
import { SaveOutlined } from '@ant-design/icons';
import './setrate_styles.css';

const { Content } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;

const subCategoryMatches = (wrSub, task) => {
    if (wrSub === task) return true;
    const aliases = SUB_CATEGORY_ALIASES[task];
    return aliases && aliases.some((a) => a === wrSub);
};

export default function SetRate() {
    const currentProject = useSelector(selectCurrentProject);
    const shouldLockProject = useSelector(selectShouldLockProject);

    const [projects, setProjects] = useState([]);
    const [unitsList, setUnitsList] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [floors, setFloors] = useState([]);
    const [workRates, setWorkRates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedFloor, setSelectedFloor] = useState(null);

    const [tableData, setTableData] = useState([]);

    // Fetch Initial Data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const projectResult = await assignWork.fetchProjects();
                if (projectResult.success) setProjects(projectResult.result || []);

                const unitsResult = await assignWork.fetchUnits();
                if (unitsResult.success) setUnitsList(unitsResult.result || []);

                if (shouldLockProject && currentProject) {
                    setSelectedProject(currentProject);
                }
            } catch (error) {
                console.error('Error fetching initial data:', error);
                message.error('Failed to load initial data');
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [shouldLockProject, currentProject]);

    // Update Buildings when Project changes
    useEffect(() => {
        if (selectedProject && unitsList.length > 0) {
            const projectUnits = unitsList.filter(u => {
                const unitProjectId = typeof u.projectId === 'object' ? u.projectId._id : u.projectId;
                return unitProjectId === selectedProject._id || unitProjectId === selectedProject.projectCode;
            });
            const uniqueBuildings = [...new Set(projectUnits.map(u => u.buildingName || u.towerOrWing).filter(Boolean))].sort();
            setBuildings(uniqueBuildings);
        } else {
            setBuildings([]);
        }
        setSelectedBuilding(null);
    }, [selectedProject, unitsList]);

    // Update Floors when Building changes
    useEffect(() => {
        if (selectedProject && selectedBuilding && unitsList.length > 0) {
            const buildingUnits = unitsList.filter(u => {
                const unitProjectId = typeof u.projectId === 'object' ? u.projectId._id : u.projectId;
                const matchesProject = unitProjectId === selectedProject._id || unitProjectId === selectedProject.projectCode;
                const bName = u.buildingName || u.towerOrWing;
                return matchesProject && bName === selectedBuilding;
            });
            const uniqueFloors = [...new Set(buildingUnits.map(u => u.floor || u.floorNumber).filter(Boolean))].sort((a, b) => parseInt(a) - parseInt(b));
            setFloors(uniqueFloors);
        } else {
            setFloors([]);
        }
        setSelectedFloor(null);
    }, [selectedProject, selectedBuilding, unitsList]);

    // Fetch existing work rates (all for project - some may be in "Other" category)
    const fetchRates = async () => {
        if (selectedProject) {
            setLoading(true);
            try {
                const res = await request.listAll({
                    entity: 'workrate',
                    options: { projectId: selectedProject._id }
                });
                if (res.success) setWorkRates(res.result || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchRates();
    }, [selectedProject]);

    // Prepare table data
    useEffect(() => {
        if (selectedProject && selectedBuilding && selectedCategory) {
            let filteredUnits = unitsList.filter(u => {
                const unitProjectId = typeof u.projectId === 'object' ? u.projectId._id : u.projectId;
                const matchesProject = unitProjectId === selectedProject._id || unitProjectId === selectedProject.projectCode;
                const bName = u.buildingName || u.towerOrWing;
                return matchesProject && bName === selectedBuilding;
            });

            if (selectedFloor) {
                filteredUnits = filteredUnits.filter(u => (u.floor || u.floorNumber) === selectedFloor);
            }

            const normalizeUnitType = (ut) => (ut ? String(ut).replace(/\s+/g, '').replace(/BHK/i, 'BHK') : '');
            const floorNum = (f) => {
                const n = parseInt(f, 10);
                return isNaN(n) ? 0 : n;
            };
            const data = filteredUnits.map(unit => {
                const unitData = {
                    key: unit._id,
                    unitNumber: unit.unitNumber,
                    floor: unit.floor || unit.floorNumber,
                    unitType: unit.unitType
                };
                const unitFloor = floorNum(unit.floor || unit.floorNumber);
                const unitTypeNorm = normalizeUnitType(unit.unitType);

                selectedCategory.fields.forEach(task => {
                    const candidates = workRates.filter((wr) => {
                        if (!subCategoryMatches(wr.subCategory, task)) return false;
                        if (wr.category !== selectedCategory.label && wr.category !== 'Other') return false;
                        if (wr.unitNumber && wr.unitNumber === unit.unitNumber) return true;
                        if (wr.unitNumber) return false;
                        const inFloor = unitFloor >= (wr.minFloor ?? 0) && unitFloor <= (wr.maxFloor ?? 100);
                        return inFloor;
                    });
                    const wrNorm = (w) => normalizeUnitType(w?.unitType);
                    const exactUnitType = candidates.find((wr) => unitTypeNorm && wrNorm(wr) === unitTypeNorm);
                    const rateRecord = exactUnitType || candidates[0];
                    unitData[task] = rateRecord ? rateRecord.rate : 0;
                });

                return unitData;
            });

            setTableData(data.sort((a, b) => (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true })));
        } else {
            setTableData([]);
        }
    }, [selectedProject, selectedBuilding, selectedCategory, selectedFloor, unitsList, workRates]);

    const handleRateChange = (unitNumber, task, value) => {
        setTableData(prev => prev.map(row => {
            if (row.unitNumber === unitNumber) {
                return { ...row, [task]: value };
            }
            return row;
        }));
    };

    const handleSave = async () => {
        if (!selectedProject || !selectedCategory) return;
        setSaving(true);
        try {
            const promises = [];
            for (const row of tableData) {
                for (const task of selectedCategory.fields) {
                    const currentRate = row[task];

                    // Check if rate already exists for this exact unit and task (incl. alias match)
                    const pidMatch = (id) => id === selectedProject._id || id === selectedProject.projectCode;
                    const existing = workRates.find(wr =>
                        subCategoryMatches(wr.subCategory, task) &&
                        wr.unitNumber === row.unitNumber &&
                        pidMatch(wr.projectId)
                    );

                    const payload = {
                        projectId: selectedProject._id,
                        category: selectedCategory.label,
                        subCategory: task,
                        unitNumber: row.unitNumber,
                        buildingName: selectedBuilding,
                        unitType: row.unitType,
                        floor: row.floor,
                        rate: currentRate || 0
                    };

                    if (existing) {
                        if (existing.rate !== currentRate) {
                            promises.push(request.update({ entity: 'workrate', id: existing._id, jsonData: payload }));
                        }
                    } else if (currentRate > 0) {
                        promises.push(request.create({ entity: 'workrate', jsonData: payload }));
                    }
                }
            }

            if (promises.length > 0) {
                await Promise.allSettled(promises);
                message.success('Rates saved successfully');
                fetchRates();
            } else {
                message.info('No changes to save');
            }
        } catch (error) {
            console.error(error);
            message.error('Failed to save rates');
        } finally {
            setSaving(false);
        }
    };

    const columns = useMemo(() => {
        const baseCols = [
            {
                title: 'Flat No.',
                dataIndex: 'unitNumber',
                key: 'unitNumber',
                fixed: 'left',
                width: 120,
                sorter: (a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }),
            }
        ];

        if (selectedCategory) {
            selectedCategory.fields.forEach(task => {
                baseCols.push({
                    title: task,
                    key: task,
                    render: (_, record) => (
                        <InputNumber
                            min={0}
                            step={0.01}
                            value={record[task]}
                            onChange={(val) => handleRateChange(record.unitNumber, task, val)}
                            style={{ width: '100 %' }}
                        />
                    ),
                    width: 150
                });
            });
        }

        return baseCols;
    }, [selectedCategory, tableData]);

    return (
        <Layout className="setrate-layout">
            <Content className="setrate-content">
                <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={2} style={{ margin: 0 }}>Set Rate</Title>
                        <Text type="secondary">Define base checklist rates for units</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        loading={saving}
                        disabled={tableData.length === 0}
                        size="large"
                    >
                        Save All Rates
                    </Button>
                </div>

                <Card className="filter-card" bordered={false}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} md={6}>
                            <Text strong>Project</Text>
                            <Select
                                style={{ width: '100 %', marginTop: 8 }}
                                placeholder="Select Project"
                                value={selectedProject?._id}
                                onChange={(val) => setSelectedProject(projects.find(p => p._id === val))}
                                disabled={shouldLockProject}
                            >
                                {projects.map(p => (
                                    <Option key={p._id} value={p._id}>{p.name}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Text strong>Building</Text>
                            <Select
                                style={{ width: '100 %', marginTop: 8 }}
                                placeholder="Select Building"
                                value={selectedBuilding}
                                onChange={setSelectedBuilding}
                                allowClear
                            >
                                {buildings.map(b => (
                                    <Option key={b} value={b}>{b}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Text strong>Work Type</Text>
                            <Select
                                style={{ width: '100 %', marginTop: 8 }}
                                placeholder="Select Work Type"
                                value={selectedCategory?.id}
                                onChange={(val) => setSelectedCategory(WORK_CATEGORIES.find(c => c.id === val))}
                            >
                                {WORK_CATEGORIES.map(c => (
                                    <Option key={c.id} value={c.id}>{c.label}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Text strong>Floor</Text>
                            <Select
                                style={{ width: '100 %', marginTop: 8 }}
                                placeholder="All Floors"
                                value={selectedFloor}
                                onChange={setSelectedFloor}
                                allowClear
                            >
                                {floors.map(f => (
                                    <Option key={f} value={f}>{f}</Option>
                                ))}
                            </Select>
                        </Col>
                    </Row>
                </Card>

                <Card className="table-card" bordered={false}>
                    <Table
                        columns={columns}
                        dataSource={tableData}
                        loading={loading}
                        pagination={{ pageSize: 50 }}
                        scroll={{ x: 'max-content', y: 600 }}
                        bordered
                        size="middle"
                    />
                </Card>
            </Content>
        </Layout>
    );
}
