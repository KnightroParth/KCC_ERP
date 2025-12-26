import React, { useState, useEffect } from 'react';
import { Layout, Select, Card, Empty, Typography, Collapse } from 'antd';
import { PLANNING_TYPES, PLANNING_LISTS } from './config';
import { assignWork } from '@/request/assignWork';

const { Content } = Layout;
const { Option } = Select;
const { Title } = Typography;

export default function Planning() {
    const [projects, setProjects] = useState([]);
    const [unitsList, setUnitsList] = useState([]);

    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedType, setSelectedType] = useState(null);

    const [buildings, setBuildings] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);

    // Fetch projects and units on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingProjects(true);
                const projectResult = await assignWork.fetchProjects();
                if (projectResult.success) {
                    setProjects(projectResult.result || []);
                }

                const unitsResult = await assignWork.fetchUnits();
                if (unitsResult.success) {
                    setUnitsList(unitsResult.result || []);
                }
            } catch (error) {
                console.error('Error fetching initial data:', error);
            } finally {
                setLoadingProjects(false);
            }
        };
        fetchData();
    }, []);

    // Update building options when project changes
    useEffect(() => {
        const updateBuildingsForProject = () => {
            if (selectedProject && unitsList.length > 0) {
                const getBuildingName = (unit) => unit.buildingName || unit.towerOrWing;

                // Filter units for selected project
                const projectUnits = unitsList.filter(u => {
                    if (!u) return false;

                    const selectedProjId = selectedProject._id;
                    const selectedProjCode = selectedProject.projectCode || selectedProject.code;
                    const selectedProjName = selectedProject.name;

                    const unitProjectId = typeof u.projectId === 'object'
                        ? u.projectId._id || u.projectId
                        : u.projectId;

                    const matchesById = unitProjectId === selectedProjId;
                    const matchesByCode = unitProjectId === selectedProjCode;
                    const matchesByProjectCodeField = u.projectCode === selectedProjCode;
                    const matchesByNameField = u.project === selectedProjName || u.projectName === selectedProjName;

                    return matchesById || matchesByCode || matchesByProjectCodeField || matchesByNameField;
                });

                const uniqueBuildings = [...new Set(
                    projectUnits
                        .map(getBuildingName)
                        .filter(Boolean)
                )].sort();

                setBuildings(uniqueBuildings);
            } else {
                setBuildings([]);
            }

            setSelectedBuilding(null);
        };

        updateBuildingsForProject();
    }, [selectedProject, unitsList]);

    const handleProjectChange = (value) => {
        const project = projects.find((p) => p._id === value);
        setSelectedProject(project || null);
    };

    const handleBuildingChange = (value) => {
        setSelectedBuilding(value);
    };

    const handleTypeChange = (value) => {
        const type = PLANNING_TYPES.find((t) => t.id === value);
        setSelectedType(type || null);
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>
            <Content style={{ padding: '32px 24px' }}>
                <div className="page-content-inner">
                    <div style={{ marginBottom: 32 }}>
                        <h1 className="page-title">Planning</h1>
                        <p style={{ color: '#8c8c8c', marginBottom: 0 }}>Manage planning across projects and buildings</p>
                    </div>

                    <div className="filter-bar">
                        <div className="filter-bar-item" style={{ flex: 1, minWidth: 250 }}>
                            <label className="filter-bar-label">Project</label>
                            <Select
                                placeholder="Select Project"
                                style={{ width: '100%' }}
                                onChange={handleProjectChange}
                                size="large"
                                loading={loadingProjects}
                                value={selectedProject ? selectedProject._id : undefined}
                                allowClear
                            >
                                {projects.map((p) => (
                                    <Option key={p._id} value={p._id}>
                                        {p.name}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="filter-bar-item" style={{ flex: 1, minWidth: 250 }}>
                            <label className="filter-bar-label">Building</label>
                            <Select
                                placeholder={
                                    !selectedProject
                                        ? "Select a project first"
                                        : buildings.length === 0
                                            ? "No buildings found for this project"
                                            : "Select Building/Tower"
                                }
                                style={{ width: '100%' }}
                                onChange={handleBuildingChange}
                                size="large"
                                disabled={!selectedProject}
                                value={selectedBuilding}
                                allowClear
                                notFoundContent={
                                    selectedProject && buildings.length === 0
                                        ? "No buildings available for this project"
                                        : null
                                }
                            >
                                {buildings.map((b) => (
                                    <Option key={b} value={b}>
                                        {b}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="filter-bar-item" style={{ flex: 1, minWidth: 250 }}>
                            <label className="filter-bar-label">Type</label>
                            <Select
                                placeholder="Select Type"
                                style={{ width: '100%' }}
                                onChange={handleTypeChange}
                                size="large"
                                value={selectedType ? selectedType.id : undefined}
                                allowClear
                            >
                                {PLANNING_TYPES.map((t) => (
                                    <Option key={t.id} value={t.id}>
                                        {t.label}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    {selectedProject && selectedBuilding && selectedType ? (
                        <div className="card-section">
                            <Card bordered={false} className="planning-collapse-card">
                                <Collapse accordion size="large">
                                    {PLANNING_LISTS[selectedType.id]?.map((item, index) => (
                                        <Collapse.Panel
                                            header={<span style={{ fontWeight: 500 }}>{item}</span>}
                                            key={index}
                                        >
                                            <Empty description="No checklist items yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                        </Collapse.Panel>
                                    ))}
                                </Collapse>
                            </Card>
                        </div>
                    ) : (
                        <div className="card-section">
                            <Empty description="Please select a Project, Building, and Type to view planning details" />
                        </div>
                    )}
                </div>
            </Content>
        </Layout>
    );
}
