import React from 'react';
import { Table, Button, Popconfirm, Tooltip, Checkbox } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

export default function WorkTable({
    data,
    selectedCategory,
    onTaskChange,
    onDelete,
    loading
}) {
    // Return early if no category selected (though index.jsx handles this)
    if (!selectedCategory) return null;

    // Define columns
    // Define columns
    const columns = [
        {
            title: 'Flat No. / Unit No.',
            key: 'unitInfo',
            width: 150,
            fixed: 'left',
            render: (_, record) => (
                <span>
                    {record.towerOrWing ? `${record.towerOrWing} - ` : ''}{record.unitNumber}
                </span>
            ),
            sorter: (a, b) => {
                const numA = parseInt(a.unitNumber.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.unitNumber.replace(/\D/g, '')) || 0;
                return numA - numB;
            },
        },
    ];

    // Add dynamic columns based on selected category fields
    if (selectedCategory && selectedCategory.fields) {
        selectedCategory.fields.forEach(task => {
            columns.push({
                title: task,
                dataIndex: 'assignedTasks',
                key: task,
                width: 120,
                align: 'center',
                render: (assignedTasks, record) => {
                    const isChecked = Array.isArray(assignedTasks) && assignedTasks.includes(task);
                    return (
                        <Checkbox
                            checked={isChecked}
                            onChange={(e) => {
                                // Prevent table row click handlers or parent forms from reacting
                                if (e && e.stopPropagation) e.stopPropagation();
                                if (e && e.preventDefault) e.preventDefault();
                                onTaskChange(record, task, e.target.checked);
                            }}
                            onClick={(e) => {
                                // Extra safety: stop propagation on click
                                if (e && e.stopPropagation) e.stopPropagation();
                            }}
                        />
                    );
                },
            });
        });
    }

    // Add Action column at the end
    columns.push({
        title: 'Action',
        key: 'action',
        width: 100,
        fixed: 'right',
        render: (_, record) => (
            <Popconfirm
                title="Are you sure to clear all work for this unit?"
                onConfirm={() => onDelete(record._id)}
                okText="Yes"
                cancelText="No"
                disabled={!record.assignedTasks || record.assignedTasks.length === 0}
            >
                <Tooltip title="Clear All">
                    <Button
                        danger
                        type="primary"
                        icon={<DeleteOutlined />}
                        size="small"
                        disabled={!record.assignedTasks || record.assignedTasks.length === 0}
                        style={{ 
                            backgroundColor: '#ff4d4f',
                            borderColor: '#ff4d4f',
                            color: '#fff'
                        }}
                    >
                        Delete
                    </Button>
                </Tooltip>
            </Popconfirm>
        ),
    });

    return (
        <Table
            columns={columns}
            dataSource={data}
            rowKey="_id"
            style={{ marginTop: 20 }}
            pagination={{ pageSize: 20 }}
            loading={loading}
            scroll={{ x: 'max-content', y: 600 }}
            // Footer shows total count of units displayed
            footer={() => (
                <div style={{ textAlign: 'right', fontWeight: 600, paddingRight: 12 }}>
                    Total Units: {Array.isArray(data) ? data.length : 0}
                </div>
            )}
            size="middle"
            bordered
        />
    );
}
