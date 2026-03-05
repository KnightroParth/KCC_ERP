import React from 'react';
import { Table, Checkbox, Input } from 'antd';

const CHECK_POINTS = [
    "Grill fitting done",
    "Frame screws fitted",
    "TPI bearing fitted",
    "Lock/handle fitted",
    "Glass bedding done",
    "Track bedding done",
    "Drainage hole provided",
    "Paper/protective cover removed",
    "Glass cleaned",
    "Window slides properly",
    "Silicone sealant filling done around frame",
    "Window size as per drawing (L x H)",
    "Quantity matches drawing",
];

const FinishingWForm = ({ data, setData }) => {
    const rowData = data.rows || {};

    const handleCheck = (point, checked) => {
        const curr = rowData[point] || {};
        setData({ ...data, rows: { ...rowData, [point]: { ...curr, verified: checked } } });
    };

    const allChecked = CHECK_POINTS.length > 0 && CHECK_POINTS.every(p => rowData[p]?.verified);
    const someChecked = !allChecked && CHECK_POINTS.some(p => rowData[p]?.verified);

    const handleSelectAll = (checked) => {
        const updatedRows = { ...rowData };
        CHECK_POINTS.forEach(p => {
            updatedRows[p] = { ...(updatedRows[p] || {}), verified: checked };
        });
        setData({ ...data, rows: updatedRows });
    };

    const handleRemark = (point, value) => {
        const curr = rowData[point] || {};
        setData({ ...data, rows: { ...rowData, [point]: { ...curr, remark: value } } });
    };

    const columns = [
        { title: '#', dataIndex: 'index', width: 50, render: (_, __, i) => i + 1 },
        { title: 'Check Point', dataIndex: 'point', width: 280 },
        {
            title: (
                <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked}
                    onChange={e => handleSelectAll(e.target.checked)}
                >
                    Verified
                </Checkbox>
            ),
            width: 90, align: 'center',
            render: (_, record) => (
                <Checkbox
                    checked={rowData[record.point]?.verified || false}
                    onChange={e => handleCheck(record.point, e.target.checked)}
                />
            )
        },
        {
            title: 'Remarks',
            render: (_, record) => (
                <Input
                    value={rowData[record.point]?.remark || ''}
                    onChange={e => handleRemark(record.point, e.target.value)}
                    placeholder="Add remarks"
                />
            )
        }
    ];

    const dataSource = CHECK_POINTS.map(point => ({ key: point, point }));

    return (
        <Table
            dataSource={dataSource}
            columns={columns}
            pagination={false}
            size="small"
            bordered
        />
    );
};

export default FinishingWForm;
