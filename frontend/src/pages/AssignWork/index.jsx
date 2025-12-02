import React, { useState, useEffect } from 'react';
import { Layout, Select, Card, Row, Col, Typography, message } from 'antd';
import WorkForm from './WorkForm';
import WorkTable from './WorkTable';
import { WORK_CATEGORIES } from './config';
import { assignWork } from '@/request/assignWork';

const { Content } = Layout;
const { Option } = Select;
const { Title } = Typography;

export default function AssignWork() {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [tableData, setTableData] = useState([]);
    const [loadingTable, setLoadingTable] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [initialFormValues, setInitialFormValues] = useState(null);

    // Fetch projects and all assignments on mount
    useEffect(() => {
        const fetchData = async () => {
            const projectResult = await assignWork.fetchProjects();
            if (projectResult.success) {
                setProjects(projectResult.result);
            }

            setLoadingTable(true);
            const assignmentsResult = await assignWork.listAll();
            if (assignmentsResult.success) {
                setTableData(assignmentsResult.result);
            }
            setLoadingTable(false);
        };
        fetchData();
    }, []);

    // Fetch assignments when project or category changes
    useEffect(() => {
        if (selectedProject || selectedCategory) {
            fetchAssignments();
        }
    }, [selectedProject, selectedCategory]);

    const fetchAssignments = async () => {
        setLoadingTable(true);
        const options = {};
        if (selectedProject) options.projectId = selectedProject._id;
        if (selectedCategory) options.workCode = selectedCategory.id;

        const result = await assignWork.list(options);
        if (result.success) {
            setTableData(result.result);
        }
        setLoadingTable(false);
    };

    const handleProjectChange = (value) => {
        const project = projects.find((p) => p._id === value);
        setSelectedProject(project);
    };

    const handleCategoryChange = (value) => {
        const category = WORK_CATEGORIES.find((c) => c.id === value);
        setSelectedCategory(category);
    };

    const handleFormSuccess = () => {
        fetchAssignments();
        setEditingId(null);
        setInitialFormValues(null);
    };

    const handleDelete = async (id) => {
        const result = await assignWork.delete(id);
        if (result.success) {
            // message.success('Record deleted successfully'); // Handled by request.js
            fetchAssignments();
        }
    };

    const handleEdit = (record) => {
        const project = projects.find(p => p._id === record.projectId);
        const category = WORK_CATEGORIES.find(c => c.id === record.workCode);

        setSelectedProject(project);
        setSelectedCategory(category);
        setEditingId(record._id);
        setInitialFormValues(record.values);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setInitialFormValues(null);
        // Optionally reset selection or keep it
    };

    return (
        <Layout style={{ padding: '24px', minHeight: '100vh', background: '#f0f2f5' }}>
            <Content>
                <div style={{ marginBottom: 24 }}>
                    <Title level={2}>Assign Work Titles</Title>
                </div>

                <Card style={{ marginBottom: 24 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Select
                                placeholder="Select Project"
                                style={{ width: '100%' }}
                                onChange={handleProjectChange}
                                size="large"
                                loading={projects.length === 0}
                            >
                                {projects.map((p) => (
                                    <Option key={p._id} value={p._id}>
                                        {p.name}
                                    </Option>
                                ))}
                            </Select>
                        </Col>
                        <Col span={12}>
                            <Select
                                placeholder="Select Work Category"
                                style={{ width: '100%' }}
                                onChange={handleCategoryChange}
                                size="large"
                            >
                                {WORK_CATEGORIES.map((c) => (
                                    <Option key={c.id} value={c.id}>
                                        {c.label}
                                    </Option>
                                ))}
                            </Select>
                        </Col>
                    </Row>
                </Card>

                <WorkForm
                    fields={selectedCategory ? selectedCategory.fields : []}
                    selectedProject={selectedProject}
                    selectedCategory={selectedCategory}
                    onSuccess={handleFormSuccess}
                    initialValues={initialFormValues}
                    editingId={editingId}
                    onCancelEdit={handleCancelEdit}
                />

                <WorkTable
                    data={tableData}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    loading={loadingTable}
                    projects={projects}
                />
            </Content>
        </Layout>
    );
}
