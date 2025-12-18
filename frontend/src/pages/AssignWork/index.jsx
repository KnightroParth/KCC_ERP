import React, { useState, useEffect } from 'react';
import { Layout, Select, Card, Row, Col, Typography, message, Empty } from 'antd';
import WorkTable from './WorkTable';
import { WORK_CATEGORIES, WORK_TASK_CONFIG } from './config';
import { assignWork } from '@/request/assignWork';

const { Content } = Layout;
const { Option } = Select;
const { Title } = Typography;

export default function AssignWork() {
    const [projects, setProjects] = useState([]);
    const [unitsList, setUnitsList] = useState([]);
    const [assignments, setAssignments] = useState([]);

    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const [tableData, setTableData] = useState([]);
    const [loadingTable, setLoadingTable] = useState(false);
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
                message.error('Failed to load projects and units');
            } finally {
                setLoadingProjects(false);
            }
        };
        fetchData();
    }, []);

    /**
     * Update building options when project changes
     * CRITICAL FIX: Filter buildings strictly by selected project to prevent cross-project contamination
     */
    useEffect(() => {
        const updateBuildingsForProject = async () => {
            if (selectedProject) {
                // Debug: Log what we're working with
                console.log('Selected Project:', selectedProject);
                console.log('Units List available:', unitsList.length);
                
                let projectUnits = [];
                
                // First try: Filter from existing units list
                if (unitsList.length > 0) {
                    projectUnits = unitsList.filter(u => {
                        if (!u) return false;
                        
                        // Get the selected project identifiers
                        const selectedProjId = selectedProject._id;
                        const selectedProjCode = selectedProject.projectCode || selectedProject.code;
                        const selectedProjName = selectedProject.name;
                        
                        console.log('Checking unit:', u.unitNumber, 'projectId:', u.projectId);
                        
                        // Extract unit's project reference - handle multiple formats
                        const unitProjectId = typeof u.projectId === 'object' 
                            ? u.projectId._id || u.projectId 
                            : u.projectId;
                        
                        // Try multiple matching strategies:
                        // 1. Match by MongoDB _id
                        const matchesById = unitProjectId === selectedProjId;
                        
                        // 2. Match by project code (units often store projectCode not _id)
                        const matchesByCode = unitProjectId === selectedProjCode;
                        
                        // 3. Match by projectCode field if it exists
                        const matchesByProjectCodeField = u.projectCode === selectedProjCode;
                        
                        // 4. Match by project name field if it exists
                        const matchesByNameField = u.project === selectedProjName || u.projectName === selectedProjName;
                        
                        const matches = matchesById || matchesByCode || matchesByProjectCodeField || matchesByNameField;
                        
                        if (matches) {
                            console.log('✓ Unit matched:', u.unitNumber, 'Building:', u.buildingName || u.towerOrWing);
                        }
                        
                        return matches;
                    });
                    
                    console.log('Filtered project units from full list:', projectUnits.length);
                }
                
                // Fallback: If no units found, try fetching units by project code
                if (projectUnits.length === 0 && selectedProject.projectCode) {
                    try {
                        console.log('No units found in list, fetching by project code...');
                        const result = await assignWork.fetchUnitsByProject(selectedProject.projectCode);
                        if (result.success && result.result) {
                            projectUnits = result.result;
                            console.log('Fetched units by project code:', projectUnits.length);
                        }
                    } catch (error) {
                        console.log('Error fetching units by project code:', error);
                    }
                }
                
                // Extract buildings from units
                const getBuildingName = (unit) => unit.buildingName || unit.towerOrWing;

                const uniqueBuildings = [...new Set(
                    projectUnits
                        .map(getBuildingName)
                        .filter(Boolean)
                )].sort();

                console.log('Unique buildings found:', uniqueBuildings.length, uniqueBuildings);
                setBuildings(uniqueBuildings);
            } else {
                setBuildings([]);
            }
            
            // Clear building selection when project changes
            setSelectedBuilding(null);
            // Clear table data when project changes
            setTableData([]);
        };
        
        updateBuildingsForProject();
    }, [selectedProject, unitsList]);

    /**
     * Fetch assignments when project or category changes
     * These are persisted work assignments from the database
     */
    useEffect(() => {
        const fetchAssignments = async () => {
            if (selectedProject && selectedCategory) {
                try {
                    setLoadingTable(true);
                    const result = await assignWork.list({
                        projectId: selectedProject._id,
                        workCode: selectedCategory.id
                    });
                    if (result.success) {
                        setAssignments(result.result || []);
                    } else {
                        setAssignments([]);
                    }
                } catch (error) {
                    console.error('Error fetching assignments:', error);
                    message.error('Failed to load work assignments');
                } finally {
                    setLoadingTable(false);
                }
            } else {
                setAssignments([]);
            }
        };
        fetchAssignments();
    }, [selectedProject, selectedCategory]);

    /**
     * Prepare table data when filters or assignments change
     * This merges unit data with persisted assignments
     */
    useEffect(() => {
        if (selectedProject && selectedBuilding && selectedCategory) {
            updateTableData();
        } else {
            setTableData([]);
        }
    }, [selectedProject, selectedBuilding, selectedCategory, assignments]);

    const updateTableData = () => {
        // Get building name helper
        const getBuildingName = (unit) => unit.buildingName || unit.towerOrWing;

        // Filter units for the selected project and building
        const filteredUnits = unitsList.filter(u => {
            // Extract projectId - can be string or object
            const unitProjectId = typeof u.projectId === 'object' 
                ? u.projectId._id 
                : u.projectId;
            
            // Get the selected project identifiers
            const selectedProjId = selectedProject._id;
            const selectedProjCode = selectedProject.projectCode || selectedProject.code;
            const selectedProjName = selectedProject.name;
            
            // Try multiple matching strategies for project
            const matchesById = unitProjectId === selectedProjId;
            const matchesByCode = unitProjectId === selectedProjCode;
            const matchesByProjectCodeField = u.projectCode === selectedProjCode;
            const matchesByNameField = u.project === selectedProjName || u.projectName === selectedProjName;
            
            const matchesProject = matchesById || matchesByCode || matchesByProjectCodeField || matchesByNameField;
            const matchesBuilding = getBuildingName(u) === selectedBuilding;
            
            return matchesProject && matchesBuilding;
        });

        // Map units to table data, merging with assignments
        const data = filteredUnits.map(unit => {
            // Find existing assignment for this unit and category
            const assignment = assignments.find(a => {
                if (!a || a.workCode !== selectedCategory.id) return false;
                
                // Match on unitId
                const aUnitId = a.unitId;
                const unitId = unit._id;
                const matchesUnit = aUnitId === unitId || String(aUnitId) === String(unitId);
                
                return matchesUnit;
            });

            // Get values from assignment - ensure it's an array
            let assignedValues = [];
            if (assignment && assignment.values) {
                assignedValues = Array.isArray(assignment.values) ? assignment.values : [];
            }

            return {
                ...unit,
                assignmentId: assignment ? (assignment._id || assignment.id) : null,
                assignedTasks: assignedValues,
            };
        });

        // Sort by unit number (numeric sort if possible)
        data.sort((a, b) => {
            const numA = parseInt(a.unitNumber.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.unitNumber.replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        setTableData(data);
    };

    const handleProjectChange = (value) => {
        const project = projects.find((p) => p._id === value);
        setSelectedProject(project || null);
    };

    const handleBuildingChange = (value) => {
        setSelectedBuilding(value);
    };

    const handleCategoryChange = (value) => {
        const category = WORK_CATEGORIES.find((c) => c.id === value);
        setSelectedCategory(category || null);
    };

    const handleTaskChange = async (unit, task, checked) => {
        // Save previous state so we can revert on failure
        const prevTableData = tableData;
        const prevAssignments = assignments;

        // Optimistic update - update local state immediately
        const newTableData = tableData.map(item => {
            if (item._id === unit._id) {
                const currentTasks = item.assignedTasks || [];
                let newTasks;
                if (checked) {
                    // Add task if not already present
                    if (!currentTasks.includes(task)) {
                        newTasks = [...currentTasks, task];
                    } else {
                        newTasks = currentTasks;
                    }
                } else {
                    // Remove task
                    newTasks = currentTasks.filter(t => t !== task);
                }
                return { ...item, assignedTasks: newTasks };
            }
            return item;
        });
        setTableData(newTableData);

        try {
            const currentRow = newTableData.find(r => r._id === unit._id) || {};
            const currentTasks = currentRow.assignedTasks || [];

            let result;

            if (unit.assignmentId) {
                // Update existing assignment
                if (currentTasks.length === 0) {
                    // Delete assignment if no tasks left
                    result = await assignWork.delete(unit.assignmentId);
                } else {
                    // Update with new tasks
                    result = await assignWork.update(unit.assignmentId, {
                        values: currentTasks,
                    });
                }
            } else {
                // No existing assignment
                if (!checked) {
                    // Nothing to persist if unchecking when no assignment exists
                    return;
                }

                // Create new assignment
                result = await assignWork.create({
                    projectId: selectedProject._id,
                    workCode: selectedCategory.id,
                    unitId: unit._id,
                    values: currentTasks,
                });
            }

            if (result.success) {
                const updatedAssignment = result.result;
                
                // Update assignments state
                setAssignments(prev => {
                    if (unit.assignmentId) {
                        // Update existing
                        if (currentTasks.length === 0) {
                            // Remove if deleted
                            return prev.filter(a => a._id !== unit.assignmentId);
                        } else {
                            // Update if modified
                            return prev.map(a => a._id === unit.assignmentId ? updatedAssignment : a);
                        }
                    } else {
                        // Add new
                        return [...prev, updatedAssignment];
                    }
                });
                
                message.success('Work assignment updated');
            } else {
                message.error("Failed to update task assignment");
                // Revert optimistic update
                setTableData(prevTableData);
                setAssignments(prevAssignments);
            }
        } catch (error) {
            console.error("Task update error:", error);
            message.error("An error occurred while updating task assignment");
            // Revert optimistic update on exception
            setTableData(prevTableData);
            setAssignments(prevAssignments);
        }
    };

    /**
     * Delete entire assignment for a unit
     */
    const handleDelete = async (unitId) => {
        const unitData = tableData.find(d => d._id === unitId);
        if (unitData && unitData.assignmentId) {
            try {
                const result = await assignWork.delete(unitData.assignmentId);
                if (result.success) {
                    message.success('Assignment cleared');
                    setAssignments(prev => prev.filter(a => a._id !== unitData.assignmentId));
                } else {
                    message.error('Failed to delete assignment');
                }
            } catch (error) {
                console.error('Delete error:', error);
                message.error('An error occurred while deleting assignment');
            }
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>
            <Content style={{ padding: '32px 24px' }}>
                <div className="page-content-inner">
                    <div style={{ marginBottom: 32 }}>
                        <h1 className="page-title">Assign Work Titles</h1>
                        <p style={{ color: '#8c8c8c', marginBottom: 0 }}>Manage work assignments across projects and buildings</p>
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
                            <label className="filter-bar-label">Work Category</label>
                            <Select
                                placeholder="Select Work Category"
                                style={{ width: '100%' }}
                                onChange={handleCategoryChange}
                                size="large"
                                value={selectedCategory ? selectedCategory.id : undefined}
                                allowClear
                            >
                                {WORK_CATEGORIES.map((c) => (
                                    <Option key={c.id} value={c.id}>
                                        {c.label}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    {selectedProject && selectedBuilding && selectedCategory ? (
                        <div className="card-section">
                            <WorkTable
                                data={tableData}
                                selectedCategory={selectedCategory}
                                workTaskConfig={WORK_TASK_CONFIG}
                                onTaskChange={handleTaskChange}
                                onDelete={handleDelete}
                                loading={loadingTable}
                            />
                        </div>
                    ) : (
                        <div className="card-section">
                            <Empty description="Please select a Project, Building, and Work Category to view assignments" />
                        </div>
                    )}
                </div>
            </Content>
        </Layout>
    );
}
