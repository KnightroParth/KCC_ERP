import React from 'react';
import { Row, Col, Card, Empty, Spin } from 'antd';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function DashboardCharts({ data, loading }) {
    const { projects = [], units = [] } = data;

    // Prepare Project Summary Data
    const projectData = projects.map((project) => {
        const projectUnits = units.filter((unit) => unit.project === project._id || unit.project?.name === project.name); // Adjust matching logic based on actual data structure
        return {
            name: project.name,
            units: projectUnits.length,
        };
    });

    // Prepare Units Status Data
    const unitStatusCounts = units.reduce((acc, unit) => {
        const status = unit.status || 'Available';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    const unitStatusData = Object.keys(unitStatusCounts).map((status) => ({
        name: status,
        value: unitStatusCounts[status],
    }));

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
            </div>
        );
    }

    // Dummy Data for Line Chart
    const lineChartData = [
        { name: 'Jan', progress: 40 },
        { name: 'Feb', progress: 30 },
        { name: 'Mar', progress: 20 },
        { name: 'Apr', progress: 27 },
        { name: 'May', progress: 18 },
        { name: 'Jun', progress: 23 },
    ];

    return (
        <>
            <Row gutter={[32, 32]}>
                <Col xs={24} lg={12}>
                    <Card title="Activities in Progress" className="shadow-sm" style={{ height: '100%', minHeight: 400 }}>
                        <div style={{ padding: '20px', fontSize: '16px', color: '#555' }}>
                            <ul style={{ paddingLeft: '20px' }}>
                                <li style={{ marginBottom: '10px' }}><strong>Electrical Wiring Work in KnightroMall is Completed</strong></li>
                                <li style={{ marginBottom: '10px' }}><strong>Painting Work on Floor 2 in Priti Villa is Under Progress</strong></li>
                                <li style={{ marginBottom: '10px' }}><strong>Tile Installation Work on Floor 3 in Lotus Green is Pending</strong></li>
                            </ul>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card title="Units Status" className="shadow-sm" style={{ height: '100%', minHeight: 400 }}>
                        {unitStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={unitStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label
                                    >
                                        {unitStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Empty description="No Unit Data" />
                        )}
                    </Card>
                </Col>
            </Row>

            <Row gutter={[32, 32]} style={{ marginTop: '32px' }}>
                <Col span={24}>
                    <Card title="Work Progress (Last 6 Months)" className="shadow-sm">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={lineChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="progress" stroke="#8884d8" activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>
        </>
    );
}
