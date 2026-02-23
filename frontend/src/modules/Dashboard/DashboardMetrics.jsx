import React from 'react';
import { Row, Col, Card, Statistic, Spin } from 'antd';
import { ProjectOutlined, HomeOutlined, CheckSquareOutlined, ClockCircleOutlined } from '@ant-design/icons';

const MetricCard = ({ title, value, icon, loading, color }) => (
    <Card 
        bordered={false} 
        className="shadow" 
        style={{ 
            height: '100%',
            borderRadius: '6px',
            background: '#fff',
            border: '1px solid #f0f0f0'
        }}
        bodyStyle={{ padding: '24px' }}
    >
        <Spin spinning={loading}>
            <Statistic
                title={<span style={{ fontSize: '14px', fontWeight: 500, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>}
                value={value}
                valueStyle={{ color: color, fontWeight: '700', fontSize: '32px' }}
                prefix={<span style={{ marginRight: '8px', fontSize: '20px' }}>{icon}</span>}
            />
        </Spin>
    </Card>
);

export default function DashboardMetrics({ data, loading }) {
    const { projects = [], units = [], activities = [], progress = [] } = data;

    const totalProjects = projects.length;
    const totalUnits = units.length;
    const totalActivities = activities.length;
    const pendingProgress = progress.filter(p => p.status !== 'Completed').length;

    return (
        <Row gutter={[32, 32]}>
            <Col xs={24} sm={12} lg={6}>
                <MetricCard
                    title="Total Projects"
                    value={totalProjects}
                    icon={<ProjectOutlined style={{ marginRight: 8 }} />}
                    loading={loading}
                    color="#1890ff"
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <MetricCard
                    title="Total Units"
                    value={totalUnits}
                    icon={<HomeOutlined style={{ marginRight: 8 }} />}
                    loading={loading}
                    color="#52c41a"
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <MetricCard
                    title="Total Activities"
                    value={totalActivities}
                    icon={<CheckSquareOutlined style={{ marginRight: 8 }} />}
                    loading={loading}
                    color="#faad14"
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <MetricCard
                    title="Pending Progress"
                    value={pendingProgress}
                    icon={<ClockCircleOutlined style={{ marginRight: 8 }} />}
                    loading={loading}
                    color="#f5222d"
                />
            </Col>
        </Row>
    );
}
