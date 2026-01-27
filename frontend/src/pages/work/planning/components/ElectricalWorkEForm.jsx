import React from 'react';
import { Table, Checkbox, Input, DatePicker } from 'antd';
import dayjs from 'dayjs';

const CHECKPOINTS_BY_TASK = {
    "Block to parking meter panel pipe fitting": [
        "Pipe fitting should be in line & level and every pipe joint connect with pvc solution",
        "Pipe should be separate for each flat"
    ],
    "Block to parking meter panel wiring": [
        "Continuous Wiring from D.B to parking meter panel without any joint"
    ],
    "Block Panel Fitting": [
        "Meter & Main switch Fitting",
        "Electric supply connected from meter panel to D.B. & testing of Wiring"
    ]
};

const ElectricalWorkEForm = ({ data, setData, currentTask }) => {
    const checkPoints = CHECKPOINTS_BY_TASK[currentTask] || [];
    const rowData = data.rows || {};

    const handleUpdate = (point, field, value) => {
        const currentPointData = rowData[point] || { status: false, remark: '', checkDate: null };
        const updatedPointData = { ...currentPointData, [field]: value };
        const updatedRows = { ...rowData, [point]: updatedPointData };
        setData({ ...data, rows: updatedRows });
    };

    const dataSource = checkPoints.map((point, index) => ({
        key: point,
        srNo: index + 1,
        point: point,
        status: rowData[point]?.status || false,
        remark: rowData[point]?.remark || '',
        checkDate: rowData[point]?.checkDate || null,
    }));

    const columns = [
        {
            title: 'Sr. No',
            dataIndex: 'srNo',
            width: 70,
            align: 'center',
        },
        {
            title: 'Check Point',
            dataIndex: 'point',
            width: 400,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 100,
            align: 'center',
            render: (checked, record) => (
                <Checkbox
                    checked={checked}
                    onChange={e => handleUpdate(record.key, 'status', e.target.checked)}
                />
            )
        },
        {
            title: 'Remark',
            dataIndex: 'remark',
            align: 'center',
            render: (text, record) => (
                <Input
                    size="small"
                    value={text}
                    onChange={e => handleUpdate(record.key, 'remark', e.target.value)}
                />
            )
        }
    ];

    return (
        <Table
            dataSource={dataSource}
            columns={columns}
            pagination={false}
            size="small"
            bordered
            scroll={{ x: 'max-content' }}
        />
    );
};

export default ElectricalWorkEForm;
