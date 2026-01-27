import React, { useState, useEffect } from 'react';
import { Layout, Select, Card, Empty, Table, Tag } from 'antd';
import request from '@/request/request';
import { WORK_CATEGORIES } from '@/config/workConfig';

const { Content } = Layout;
const { Option } = Select;

export default function WorkInProgress() {
    const [projects, setProjects] = useState([]);
    const [unitsList, setUnitsList] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);

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
        if (selectedProject) {
            const projectUnits = unitsList.filter(u => u.projectId?._id === selectedProject || u.projectId === selectedProject);
            const uniqueBuildings = [...new Set(projectUnits.map(u => u.buildingName || u.towerOrWing).filter(Boolean))].sort();
            setBuildings(uniqueBuildings);
        } else {
            setBuildings([]);
        }
        setSelectedBuilding(null);
    }, [selectedProject, unitsList]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await request.listAll({ entity: 'activities' });
                if (res.success) {
                    let filtered = res.result || [];
                    if (selectedProject) filtered = filtered.filter(a => (a.projectId?._id || a.projectId) === selectedProject);
                    if (selectedBuilding) {
                        filtered = filtered.filter(a => {
                            const unit = unitsList.find(u => u._id === (a.unitId?._id || a.unitId));
                            return (unit?.buildingName || unit?.towerOrWing) === selectedBuilding;
                        });
                    }
                    if (selectedCategory) filtered = filtered.filter(a => a.category === selectedCategory);
                    setData(filtered);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedProject, selectedBuilding, selectedCategory, unitsList]);

    const columns = [
        { title: 'Project', dataIndex: ['projectId', 'name'], key: 'project' },
        {
            title: 'Building', key: 'building', render: (_, record) => {
                const unit = unitsList.find(u => u._id === (record.unitId?._id || record.unitId));
                return unit?.buildingName || unit?.towerOrWing || '-';
            }
        },
        {
            title: 'Unit', key: 'unit', render: (_, record) => {
                const unit = unitsList.find(u => u._id === (record.unitId?._id || record.unitId));
                return unit?.unitNumber || '-';
            }
        },
        { title: 'Work Type', dataIndex: 'category', key: 'category', render: (text) => <Tag color="blue">{text}</Tag> },
        { title: 'Activity', dataIndex: 'activityName', key: 'activity' },
        { title: 'Status', key: 'status', render: () => <Tag color="orange">In Progress</Tag> }
    ];

    return (
        <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>
            <Content style={{ padding: '32px 24px' }}>
                <div className="page-content-inner">
                    <div style={{ marginBottom: 32 }}>
                        <h1 className="page-title">Work in Progress</h1>
                        <p style={{ color: '#8c8c8c' }}>Track ongoing work activities</p>
                    </div>

                    <div className="filter-bar" style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                        <Select
                            placeholder="Select Project"
                            style={{ flex: 1 }}
                            onChange={setSelectedProject}
                            value={selectedProject}
                            allowClear
                        >
                            {projects.map(p => <Option key={p._id} value={p._id}>{p.name}</Option>)}
                        </Select>

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

                        <Select
                            placeholder="Select Work Type"
                            style={{ flex: 1 }}
                            onChange={setSelectedCategory}
                            value={selectedCategory}
                            allowClear
                        >
                            {WORK_CATEGORIES.map(c => <Option key={c.label} value={c.label}>{c.label}</Option>)}
                        </Select>
                    </div>

                    <Card bordered={false}>
                        <Table
                            columns={columns}
                            dataSource={data}
                            rowKey="_id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                            locale={{ emptyText: <Empty description="No work in progress found" /> }}
                        />
                    </Card>
                </div>
            </Content>
        </Layout>
    );
}
