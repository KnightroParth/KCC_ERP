import React from 'react';
import { Table, Checkbox, Input } from 'antd';

const CHECK_POINTS = [
    // Door Frame Fitting
    "Hold fast fitting",
    "Chaukat top level",
    "Outer gola",
    "Chaukat patam bottom dutta",
    "Chaukat patam top dutta",
    "Line and face",
    "Door panel opening face",
    "Wall & frame gap filling",
    "Properly jamb fitting",
    // Block Work
    "100% Rangat completed",
    "Column casting done",
    "Pardi casting done",
    "1st layer of block work on rangat in level",
    "Every layer of block work in level",
    "Proper joint filling between column/beam & block work",
    "Coping size in line & level",
    "All chaukats in plumb, line & level with hold fast & column patti properly fitted",
    "Block work up to lintel level",
    "All lintel, chajja & loft in plumb, line & level with correct thickness",
    "Lintel to beam bottom block work fitted",
    "Every joint of block work properly filled",
    "All window grill & railing in plumb, line & level with hold fast & column patti",
    "Cleaning of window, railing and door frame",
    "Curing done",
    // Inside Plaster / Gypsum
    "Leakage checking done before plastering",
    "Watering done one day before plastering",
    "Location of electrical fitting at proper position as per drawing",
    "Mesh fitting at RCC/block work joint",
    "Mortar proportion correct",
    "Cement slurry application on RCC work",
    "Thiyyas for plaster thickness checking",
    "Plaster - line check",
    "Plaster - dhar check",
    "Plaster - level check",
    "Plaster - right angle check",
    "5\" plaster cutting for skirting in line and level",
    "Cleaning of window and door frame post plaster",
    "Curing after plaster done",
    "Fan hook at correct position",
];

const CivilWorkForm = ({ data, setData }) => {
    const rowData = data.rows || {};

    const handleCheck = (point, checked) => {
        const curr = rowData[point] || {};
        setData({ ...data, rows: { ...rowData, [point]: { ...curr, verified: checked } } });
    };

    const handleRemark = (point, value) => {
        const curr = rowData[point] || {};
        setData({ ...data, rows: { ...rowData, [point]: { ...curr, remark: value } } });
    };

    const columns = [
        { title: '#', dataIndex: 'index', width: 50, render: (_, __, i) => i + 1 },
        { title: 'Check Point', dataIndex: 'point', width: 320 },
        {
            title: 'Verified', width: 90, align: 'center',
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

export default CivilWorkForm;
