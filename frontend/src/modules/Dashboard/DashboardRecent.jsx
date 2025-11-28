import React from 'react';
import { Card, Table, Tag } from 'antd';
import dayjs from 'dayjs';

export default function DashboardRecent({ data, loading }) {
    const { progress = [] } = data;

    // If no progress data (which is expected now), we can either hide the component or show empty state.
    // User asked to "comment the activity related updates", so hiding it is safer to avoid confusion.
    if (true) return null; // Force hide for now

    // Sort by date descending and take top 5
    const recentProgress = [...progress]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    const columns = [
        {
            title: 'Project',
            dataIndex: ['project', 'name'],
            key: 'project',
            render: (text, record) => record.project?.name || record.project || 'N/A',
        },
        {
            title: 'Unit',
            dataIndex: ['unit', 'name'],
            key: 'unit',
            render: (text, record) => record.unit?.name || record.unit || 'N/A',
        },
        {
            title: 'Activity',
            dataIndex: ['activity', 'name'],
            key: 'activity',
            render: (text, record) => record.activity?.name || record.activity || 'N/A',
        },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (date) => dayjs(date).format('DD/MM/YYYY'),
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity',
            key: 'quantity',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'default';
                if (status === 'Completed') color = 'success';
                if (status === 'In Progress') color = 'processing';
                if (status === 'Pending') color = 'warning';
                return <Tag color={color}>{status}</Tag>;
            },
        },
    ];

    return (
        <Card title="Recent Work Progress" className="shadow-sm" style={{ marginTop: 32 }}>
            <Table
                columns={columns}
                dataSource={recentProgress}
                rowKey="_id"
                loading={loading}
                pagination={false}
                locale={{ emptyText: 'No recent progress found' }}
            />
        </Card>
    );
}
