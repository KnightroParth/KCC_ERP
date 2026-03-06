// frontend/src/pages/work/SetRate/index.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Select, Card, Table, InputNumber, Row, Col, message, Typography, Button, Space, Upload, Switch, Tag } from 'antd';
import { useSelector } from 'react-redux';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';
import request from '@/request/request';
import { assignWork } from '@/request/assignWork';
import { WORK_CATEGORIES, SUB_CATEGORY_ALIASES, WORK_TYPE_TO_CONTRACTOR_TYPES } from '@/config/workConfig';
import { SaveOutlined, UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import storePersist from '@/redux/storePersist';
import { API_BASE_URL } from '@/config/serverApiConfig';
import { calculateDynamicRate, parseFloorStringToInt } from '@/utils/calculate';
import './setrate_styles.css';

const { Content } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;
const INCREMENT_MIN = 1;
const INCREMENT_MAX = 30;

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

    const [contractors, setContractors] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedFloor, setSelectedFloor] = useState(null);
    const [selectedContractor, setSelectedContractor] = useState(null);

    /** Category-level floor increment: applies to all activities under this Work Type for the selected contractor */
    const [floorIncrementEnabled, setFloorIncrementEnabled] = useState(false);
    const [floorIncrementPercent, setFloorIncrementPercent] = useState(5);

    const [tableData, setTableData] = useState([]);
    const [importing, setImporting] = useState(false);

    // Fetch Initial Data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const projectResult = await assignWork.fetchProjects();
                if (projectResult.success) setProjects(projectResult.result || []);

                const unitsResult = await assignWork.fetchUnits();
                if (unitsResult.success) setUnitsList(unitsResult.result || []);

                const vendorRes = await request.listAll({ entity: 'vendor', options: { enabled: true } });
                if (vendorRes?.result) setContractors(vendorRes.result);

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
                const sid = String(selectedProject._id ?? '');
                const scode = String(selectedProject.projectCode ?? '');
                return String(unitProjectId ?? '') === sid || String(unitProjectId ?? '') === scode;
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
                const sid = String(selectedProject._id ?? '');
                const scode = String(selectedProject.projectCode ?? '');
                const matchesProject = String(unitProjectId ?? '') === sid || String(unitProjectId ?? '') === scode;
                const bName = u.buildingName || u.towerOrWing;
                return matchesProject && bName === selectedBuilding;
            });
            const uniqueFloors = [...new Set(buildingUnits.map(u => u.floor ?? u.floorNumber).filter(f => f != null && f !== ''))].sort((a, b) => parseInt(a) - parseInt(b));
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
                const projectIdParam = (selectedProject._id ?? selectedProject.id)?.toString?.() ?? selectedProject._id ?? selectedProject.id ?? selectedProject.projectCode ?? '';
                const res = await request.listAll({
                    entity: 'workrate',
                    options: { projectId: projectIdParam }
                });
                if (res.success) {
                    setWorkRates(res.result || []);
                } else {
                    console.error('Failed to fetch work rates:', res.message);
                }
            } catch (e) {
                console.error('Error fetching work rates:', e);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchRates();
    }, [selectedProject, selectedContractor]);

    // Filter contractors by work type (same as Planning): only show contractors for the selected Work Type
    const filteredContractors = useMemo(() => {
        const categoryLabel = selectedCategory?.label;
        if (!categoryLabel) return contractors;
        const allowedTypes = WORK_TYPE_TO_CONTRACTOR_TYPES[categoryLabel];
        if (allowedTypes === null || allowedTypes === undefined) return contractors;
        const normalise = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const allowedNorm = allowedTypes.map(normalise);
        return contractors.filter((c) => allowedNorm.includes(normalise(c.workType)));
    }, [contractors, selectedCategory?.label]);

    // When work type changes, clear contractor if they are not in the filtered list
    useEffect(() => {
        if (!selectedContractor) return;
        const inList = filteredContractors.some(
            (c) => String(c._id ?? c.id) === String(selectedContractor._id ?? selectedContractor.id)
        );
        if (!inList) setSelectedContractor(null);
    }, [selectedCategory?.label, filteredContractors, selectedContractor]);

    // When category, contractor, or work rates change, sync rate increment from saved rates for this contractor (or project-level)
    useEffect(() => {
        if (!selectedCategory || workRates.length === 0) return;
        const normalizeCat = (s) => (s ? String(s).replace(/\s+/g, ' ').trim().toLowerCase() : '');
        const catNorm = normalizeCat(selectedCategory.label);
        const expectedCid = selectedContractor ? (selectedContractor._id ?? selectedContractor) : null;
        const withRule = workRates.filter(
            (wr) => normalizeCat(wr.category) === catNorm && wr.incrementRule
        );
        const matchContractor = expectedCid != null
            ? withRule.find((wr) => {
                const cid = wr.contractorId?._id ?? wr.contractorId;
                return cid != null && String(cid) === String(expectedCid);
            })
            : null;
        const matchProject = withRule.find((wr) => (wr.contractorId?._id ?? wr.contractorId) == null);
        const match = matchContractor || matchProject;
        if (match?.incrementRule) {
            setFloorIncrementEnabled(!!match.incrementRule.isActive);
            const pct = match.incrementRule.percentageIncrement;
            setFloorIncrementPercent(typeof pct === 'number' && pct >= INCREMENT_MIN && pct <= INCREMENT_MAX ? pct : 5);
        } else {
            setFloorIncrementEnabled(false);
            setFloorIncrementPercent(5);
        }
    }, [selectedCategory?.label, selectedContractor, workRates]);

    // Prepare table data
    useEffect(() => {
        if (selectedProject && selectedBuilding && selectedCategory) {
            const sid = String(selectedProject._id ?? '');
            const scode = String(selectedProject.projectCode ?? '');
            let filteredUnits = unitsList.filter(u => {
                const unitProjectId = typeof u.projectId === 'object' ? u.projectId._id : u.projectId;
                const matchesProject = String(unitProjectId ?? '') === sid || String(unitProjectId ?? '') === scode;
                const bName = u.buildingName || u.towerOrWing;
                return matchesProject && bName === selectedBuilding;
            });

            if (selectedFloor !== null && selectedFloor !== undefined && selectedFloor !== '') {
                filteredUnits = filteredUnits.filter(u => (u.floor ?? u.floorNumber) === selectedFloor);
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
                    floor: unit.floor ?? unit.floorNumber,
                    unitType: unit.unitType
                };
                const unitFloor = floorNum(unit.floor ?? unit.floorNumber);
                const unitTypeNorm = normalizeUnitType(unit.unitType);
                const normalizeBuilding = (b) => (b ? String(b).replace(/[\s-]/g, '').toUpperCase() : '');
                const unitBuildingNorm = normalizeBuilding(unit.buildingName || unit.towerOrWing);

                const normalizeCat = (s) => (s ? String(s).replace(/\s+/g, ' ').trim().toLowerCase() : '');
                const selCatNorm = normalizeCat(selectedCategory.label);

                const expectedCid = selectedContractor ? (selectedContractor._id ?? selectedContractor) : null;

                const getCandidatesForTask = (task, restrictToContractorId) => {
                    const taskNorm = normalizeCat(task);
                    return workRates.filter((wr) => {
                        const wrCid = wr.contractorId?._id ?? wr.contractorId;
                        if (restrictToContractorId !== undefined) {
                            if (restrictToContractorId != null) {
                                if (wrCid == null || String(wrCid) !== String(restrictToContractorId)) return false;
                            } else {
                                if (wrCid != null) return false;
                            }
                        } else if (expectedCid != null) {
                            if (wrCid != null && String(wrCid) !== String(expectedCid)) return false;
                        } else {
                            if (wrCid != null) return false;
                        }
                        const wrSub = normalizeCat(wr.subCategory);
                        let isTaskMatch = wrSub === taskNorm;
                        if (!isTaskMatch) {
                            const aliases = SUB_CATEGORY_ALIASES[task] || [];
                            isTaskMatch = aliases.some(a => normalizeCat(a) === wrSub);
                        }
                        if (!isTaskMatch) return false;

                        const wrCat = normalizeCat(wr.category);
                        if (wrCat !== selCatNorm && wrCat !== 'other') return false;

                        if (wr.unitNumber && wr.unitNumber !== unit.unitNumber) return false;
                        if (wr.unitNumber) return true;

                        const inFloor = unitFloor >= (wr.minFloor ?? 0) && unitFloor <= (wr.maxFloor ?? 1000);
                        if (!inFloor) return false;

                        if (wr.buildingName) {
                            const wrBuildingNorm = normalizeBuilding(wr.buildingName);
                            if (wrBuildingNorm && wrBuildingNorm !== unitBuildingNorm) return false;
                        }
                        return true;
                    });
                };

                const pickRateFromCandidates = (candidates) => {
                    const wrNorm = (w) => normalizeUnitType(w?.unitType);
                    const hasRate = (wr) => typeof wr.rate === 'number' && !Number.isNaN(wr.rate) && wr.rate > 0;
                    const unitNumMatch = (wr) => !wr.unitNumber || wr.unitNumber === unit.unitNumber;
                    const exactUnitType = candidates.filter(unitNumMatch).find((wr) => unitTypeNorm && wrNorm(wr) === unitTypeNorm)
                        || candidates.find((wr) => unitTypeNorm && wrNorm(wr) === unitTypeNorm);
                    const allUnitType = candidates.filter(unitNumMatch).find((wr) => (wrNorm(wr) || '').toLowerCase() === 'all')
                        || candidates.find((wr) => (wrNorm(wr) || '').toLowerCase() === 'all');
                    let rateRecord = null;
                    if (exactUnitType && hasRate(exactUnitType)) rateRecord = exactUnitType;
                    else if (exactUnitType) rateRecord = exactUnitType;
                    else if (allUnitType && hasRate(allUnitType)) rateRecord = allUnitType;
                    else if (allUnitType) rateRecord = allUnitType;
                    else rateRecord = candidates.find(hasRate) || candidates[0];
                    return rateRecord ? (rateRecord.rate ?? 0) : 0;
                };

                selectedCategory.fields.forEach(task => {
                    let candidates = getCandidatesForTask(task, expectedCid);

                    if (expectedCid != null && candidates.length > 1) {
                        candidates = [...candidates].sort((a, b) => {
                            const aC = a.contractorId?._id ?? a.contractorId;
                            const bC = b.contractorId?._id ?? b.contractorId;
                            const aMatch = aC != null && String(aC) === String(expectedCid);
                            const bMatch = bC != null && String(bC) === String(expectedCid);
                            if (aMatch && !bMatch) return -1;
                            if (!aMatch && bMatch) return 1;
                            return 0;
                        });
                    }

                    const contractorRate = pickRateFromCandidates(candidates);
                    const projectLevelCandidates = getCandidatesForTask(task, null);
                    const projectRate = pickRateFromCandidates(projectLevelCandidates);
                    // When contractor selected: show their saved rate if they have one, else fall back to project-level. When no contractor: show project-level.
                    const displayRate =
                        expectedCid != null && contractorRate > 0
                            ? contractorRate
                            : (expectedCid != null && projectRate > 0 ? projectRate : contractorRate);
                    unitData[task] = typeof displayRate === 'number' && !Number.isNaN(displayRate) ? displayRate : 0;
                });

                return unitData;
            });

            setTableData(data.sort((a, b) => (a.unitNumber || '').localeCompare(b.unitNumber || '', undefined, { numeric: true })));
        } else {
            setTableData([]);
        }
    }, [selectedProject, selectedBuilding, selectedCategory, selectedFloor, unitsList, workRates, selectedContractor]);

    const handleImportExcel = async (file) => {
        setImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const auth = storePersist.get('auth');
            const token = auth?.current?.token;
            const response = await axios.post(
                `${API_BASE_URL}workrate/import`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const result = response.data;
            if (result.success) {
                message.success(`Imported ${result.result?.totalImported ?? 0} rates successfully`);
                if (selectedProject) fetchRates();
            } else {
                message.error(result.message || 'Import failed');
            }
        } catch (error) {
            message.error('Import failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setImporting(false);
        }
        return false;
    };

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
            const contractorIdVal = selectedContractor ? (selectedContractor._id ?? selectedContractor) : null;
            const incrementRule = {
                isActive: floorIncrementEnabled,
                percentageIncrement: floorIncrementEnabled ? Math.min(INCREMENT_MAX, Math.max(INCREMENT_MIN, floorIncrementPercent)) : 0,
            };
            const promises = [];
            for (const row of tableData) {
                for (const task of selectedCategory.fields) {
                    const currentRate = row[task];

                    const pidMatch = (id) => id === selectedProject._id || id === selectedProject.projectCode;
                    const cidMatch = (wr) => {
                        const wc = wr.contractorId?._id ?? wr.contractorId;
                        return (wc == null && contractorIdVal == null) || (wc != null && String(wc) === String(contractorIdVal));
                    };
                    const existing = workRates.find(wr =>
                        subCategoryMatches(wr.subCategory, task) &&
                        wr.unitNumber === row.unitNumber &&
                        pidMatch(wr.projectId) &&
                        cidMatch(wr)
                    );

                    const payload = {
                        projectId: selectedProject._id,
                        category: selectedCategory.label,
                        subCategory: task,
                        unitNumber: row.unitNumber,
                        buildingName: selectedBuilding,
                        unitType: row.unitType,
                        floor: row.floor,
                        rate: currentRate || 0,
                        ...(contractorIdVal ? { contractorId: contractorIdVal } : {}),
                        incrementRule,
                    };

                    if (existing) {
                        const rateChanged = existing.rate !== currentRate;
                        const incChanged = (existing.incrementRule?.isActive !== incrementRule.isActive) ||
                            (existing.incrementRule?.percentageIncrement !== incrementRule.percentageIncrement);
                        if (rateChanged || incChanged) {
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
                width: 72,
                sorter: (a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }),
            }
        ];

        if (selectedCategory) {
            const incrementRule = floorIncrementEnabled && floorIncrementPercent > 0
                ? { isActive: true, percentageIncrement: floorIncrementPercent }
                : null;
            selectedCategory.fields.forEach(task => {
                baseCols.push({
                    title: task,
                    key: task,
                    render: (_, record) => {
                        const baseRate = record[task] ?? 0;
                        const floorNum = parseFloorStringToInt(record.floor);
                        const effectiveRate = incrementRule && floorNum > 0
                            ? calculateDynamicRate(baseRate, record.floor, incrementRule)
                            : baseRate;
                        const pctApplied = incrementRule && floorNum > 0 ? floorNum * floorIncrementPercent : 0;
                        if (incrementRule && floorNum > 0) {
                            return (
                                <div>
                                    <Text strong style={{ fontSize: 12 }}>₹{Number(effectiveRate).toFixed(2)}</Text>
                                    <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                                        Base ₹{Number(baseRate).toFixed(0)} +{pctApplied}% (Flr {floorNum})
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <InputNumber
                                size="small"
                                min={0}
                                step={0.01}
                                value={baseRate}
                                onChange={(val) => handleRateChange(record.unitNumber, task, val)}
                                style={{ width: '100%' }}
                            />
                        );
                    },
                    width: 100
                });
            });
        }

        return baseCols;
    }, [selectedCategory, tableData, floorIncrementEnabled, floorIncrementPercent]);

    return (
        <Layout className="setrate-layout">
            <Content className="setrate-content">
                <div className="setrate-header">
                    <div>
                        <Title level={5} className="setrate-title">Set Rate</Title>
                        <Text className="setrate-subtitle">Define base checklist rates for units</Text>
                    </div>
                    <Space size="small">
                        <Upload
                            accept=".xlsx,.xls,.csv"
                            showUploadList={false}
                            beforeUpload={(file) => {
                                const isExcel = file.type === 'application/vnd.ms-excel' ||
                                    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                                    file.type === 'text/csv';
                                if (!isExcel) {
                                    message.error('Please upload Excel (.xlsx, .xls) or CSV file');
                                    return Upload.LIST_IGNORE;
                                }
                                handleImportExcel(file);
                                return false;
                            }}
                        >
                            <Button icon={<UploadOutlined />} loading={importing} size="small">
                                Import
                            </Button>
                        </Upload>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSave}
                            loading={saving}
                            disabled={tableData.length === 0}
                            size="small"
                        >
                            Save
                        </Button>
                    </Space>
                </div>

                <Card className="filter-card" bordered={false}>
                    <Row gutter={[8, 6]} align="middle">
                        <Col xs={12} sm={8} md={6} lg={4}>
                            <span className="filter-label">Project</span>
                            <Select
                                size="small"
                                style={{ width: '100%' }}
                                placeholder="Project"
                                value={selectedProject?._id}
                                onChange={(val) => setSelectedProject(projects.find(p => p._id === val))}
                                disabled={shouldLockProject}
                                allowClear={false}
                            >
                                {projects.map(p => (
                                    <Option key={p._id} value={p._id}>{p.name}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={12} sm={8} md={6} lg={4}>
                            <span className="filter-label">Building</span>
                            <Select
                                size="small"
                                style={{ width: '100%' }}
                                placeholder="Building"
                                value={selectedBuilding}
                                onChange={setSelectedBuilding}
                                allowClear
                            >
                                {buildings.map(b => (
                                    <Option key={b} value={b}>{b}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={12} sm={8} md={6} lg={4}>
                            <span className="filter-label">Work Type</span>
                            <Select
                                size="small"
                                style={{ width: '100%' }}
                                placeholder="Work Type"
                                value={selectedCategory?.id}
                                onChange={(val) => setSelectedCategory(WORK_CATEGORIES.find(c => c.id === val))}
                            >
                                {WORK_CATEGORIES.map(c => (
                                    <Option key={c.id} value={c.id}>{c.label}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={12} sm={8} md={6} lg={4}>
                            <span className="filter-label">Contractor</span>
                            <Select
                                size="small"
                                style={{ width: '100%' }}
                                placeholder={selectedCategory ? 'Select contractor' : 'Select work type first'}
                                value={selectedContractor?._id}
                                onChange={(val) => setSelectedContractor(val ? filteredContractors.find(c => (c._id ?? c.id) === val) : null)}
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                options={filteredContractors.map((c) => ({
                                    label: `${c.name} - ${c.workType || 'General'}`,
                                    value: c._id ?? c.id
                                }))}
                            />
                        </Col>
                        <Col xs={12} sm={8} md={6} lg={3}>
                            <span className="filter-label">Floor</span>
                            <Select
                                size="small"
                                style={{ width: '100%' }}
                                placeholder="All"
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

                {selectedCategory && (
                    <Card size="small" bordered={false} className="increment-rule-card">
                        <Row gutter={[8, 0]} align="middle" wrap={false}>
                            <Col flex="none">
                                <Text strong style={{ fontSize: 12 }}>Rate increment for {selectedCategory.label}</Text>
                            </Col>
                            <Col>
                                <Switch
                                    size="small"
                                    checked={floorIncrementEnabled}
                                    onChange={setFloorIncrementEnabled}
                                />
                            </Col>
                            {floorIncrementEnabled && (
                                <Col>
                                    <InputNumber
                                        size="small"
                                        min={INCREMENT_MIN}
                                        max={INCREMENT_MAX}
                                        step={0.5}
                                        value={floorIncrementPercent}
                                        onChange={(v) => setFloorIncrementPercent(v != null ? v : 5)}
                                        style={{ width: 64 }}
                                    />
                                    <Text type="secondary" style={{ marginLeft: 4, fontSize: 11 }}>% (Flr 1+)</Text>
                                </Col>
                            )}
                            <Col>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setFloorIncrementEnabled(false);
                                        setFloorIncrementPercent(5);
                                    }}
                                >
                                    Default
                                </Button>
                            </Col>
                        </Row>
                    </Card>
                )}

                <Card className="table-card" bordered={false}>
                    <Table
                        columns={columns}
                        dataSource={tableData}
                        loading={loading}
                        pagination={{ pageSize: 50, size: 'small' }}
                        scroll={{ x: 'max-content', y: 'calc(100vh - 280px)' }}
                        bordered
                        size="small"
                        sticky
                    />
                </Card>
            </Content>
        </Layout>
    );
}
