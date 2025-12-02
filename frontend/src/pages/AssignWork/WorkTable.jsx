import React from 'react';
import { Table, Button, Popconfirm, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { WORK_CATEGORIES } from './config';

export default function WorkTable({ data, onDelete, onEdit, loading, projects = [] }) {
    const columns = [
        {
            title: 'Project',
            dataIndex: 'projectId',
            key: 'projectId',
            render: (projectId) => {
                const project = projects.find((p) => p._id === projectId);
                return project ? project.name : projectId;
            },
        },
        {
            title: 'Category Code',
            dataIndex: 'workCode',
            key: 'workCode',
            width: 120,
        },
        {
            title: 'Work',
            key: 'workLabel',
            render: (_, record) => {
                const category = WORK_CATEGORIES.find(c => c.id === record.workCode);
                return category ? category.label : record.workCode;
            }
        },
        {
            title: 'Assigned Work',
            dataIndex: 'values',
            key: 'values',
            render: (workItems) => (
                <>
                    {Array.isArray(workItems) && workItems.map((item) => (
                        <Tag color="blue" key={item}>
                            {item}
                        </Tag>
                    ))}
                </>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Tooltip title="Edit">
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => onEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Are you sure delete this record?"
                        onConfirm={() => onDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Tooltip title="Delete">
                            <Button type="primary" danger icon={<DeleteOutlined />} size="small" />
                        </Tooltip>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={data}
            rowKey="_id"
            style={{ marginTop: 20 }}
            pagination={{ pageSize: 5 }}
            loading={loading}
        />
    );
}
