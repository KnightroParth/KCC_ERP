import React, { useState, useEffect } from 'react';
import { Select, Row, Col, DatePicker, Card, Input } from 'antd';
import { useSelector } from 'react-redux';
import request from '@/request/request';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';

const { Option } = Select;
const { RangePicker } = DatePicker;

const ReportFilters = ({ onFilterChange }) => {
    const currentProject = useSelector(selectCurrentProject);
    const shouldLockProject = useSelector(selectShouldLockProject);

    const [projects, setProjects] = useState([]);
    const [unitsList, setUnitsList] = useState([]);
    const [buildings, setBuildings] = useState([]);

    const [filters, setFilters] = useState({
        projectId: null,
        buildingName: null,
        dateRange: [null, null],
    });

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
        if (shouldLockProject && currentProject?._id) {
            handleFilterChange('projectId', currentProject._id);
        }
    }, [shouldLockProject, currentProject]);

    useEffect(() => {
        if (filters.projectId) {
            const projectObj = projects.find(p => p._id === filters.projectId);
            const targetCode = projectObj?.projectCode || projectObj?.projectId;

            const projectUnits = unitsList.filter(u => {
                const unitProjectId = u.projectId?._id || u.projectId;
                return unitProjectId === targetCode || unitProjectId === filters.projectId;
            });

            const uniqueBuildings = [...new Set(projectUnits.map(u => u.buildingName || u.towerOrWing).filter(Boolean))].sort();
            setBuildings(uniqueBuildings);

            // Reset building if not in new project's list
            if (!uniqueBuildings.includes(filters.buildingName)) {
                handleFilterChange('buildingName', null);
            }
        } else {
            setBuildings([]);
            handleFilterChange('buildingName', null);
        }
    }, [filters.projectId, unitsList, projects]);

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    return (
        <Card bordered={false} style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Project</label>
                    {shouldLockProject && currentProject ? (
                        <Input
                            readOnly
                            disabled
                            style={{ color: 'rgba(0,0,0,0.88)', cursor: 'not-allowed' }}
                            value={currentProject.projectCode ? `${currentProject.name} (${currentProject.projectCode})` : currentProject.name}
                        />
                    ) : (
                        <Select
                            placeholder="Select Project"
                            style={{ width: '100%' }}
                            onChange={(val) => handleFilterChange('projectId', val)}
                            value={filters.projectId}
                            allowClear
                        >
                            {projects.map(p => <Option key={p._id} value={p._id}>{p.name}</Option>)}
                        </Select>
                    )}
                </Col>
                <Col xs={24} sm={8}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Building</label>
                    <Select
                        placeholder="Select Building"
                        style={{ width: '100%' }}
                        onChange={(val) => handleFilterChange('buildingName', val)}
                        disabled={!filters.projectId}
                        value={filters.buildingName}
                        allowClear
                    >
                        {buildings.map(b => <Option key={b} value={b}>{b}</Option>)}
                    </Select>
                </Col>
                <Col xs={24} sm={8}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Date Range</label>
                    <RangePicker
                        style={{ width: '100%' }}
                        onChange={(dates) => handleFilterChange('dateRange', dates)}
                        value={filters.dateRange}
                    />
                </Col>
            </Row>
        </Card>
    );
};

export default ReportFilters;
