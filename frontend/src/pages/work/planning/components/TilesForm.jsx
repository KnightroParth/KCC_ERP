import React from 'react';
import { Table, Checkbox, Input } from 'antd';

const CHECK_POINTS = [
    "Surface Leveling",
    "Proper Sloping",
    "Adhesive Application",
    "Line/Joint Alignment",
    "Shade Consistency",
    "No Hollow Sound",
    "Curing Done",
    "Final Grouting and Cleaning"
];

const TilesForm = ({ data, setData }) => {
    const rowData = data.rows || {};

    const handleCheck = (point, field, checked) => {
        const currentPointData = rowData[point] || {};
        const updatedPointData = { ...currentPointData, [field]: checked };
        const updatedRows = { ...rowData, [point]: updatedPointData };
        setData({ ...data, rows: updatedRows });
    };

    const handleRemark = (point, value) => {
        const currentPointData = rowData[point] || {};
        const updatedPointData = { ...currentPointData, remark: value };
        const updatedRows = { ...rowData, [point]: updatedPointData };
        setData({ ...data, rows: updatedRows });
    };

    const columns = [
        { title: 'Check Point', dataIndex: 'point', key: 'point', width: 250 },
        {
            title: 'Verified',
            dataIndex: 'verified',
            key: 'verified',
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Checkbox
                    checked={rowData[record.point]?.verified || false}
                    onChange={e => handleCheck(record.point, 'verified', e.target.checked)}
                />
            )
        },
        {
            title: 'Remarks',
            dataIndex: 'remark',
            key: 'remark',
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

export default TilesForm;
