import React from 'react';
import { Table, Checkbox, Input } from 'antd';

const CHECK_POINTS = [
    // Basic Work / Dhar finishing
    "First check civil work is completed (100%)",
    "No leakage where POP will be carried out",
    "Each & every dhar of column, beam, loft, door & window jams in right angle",
    "Each & every dhar of column, beam, loft, door & window jams in plumb",
    "Each & every dhar of column, beam, loft, door & window jams in level",
    "Each & every dhar of column, beam, loft, door & window jams in line",
    // POP Framing
    "Mark even level at 5' height from tile top on every wall",
    "Framing of POP as per drawing & design",
    // Sheet Fitting
    "Wiring of every electric point at proper position before sheet fitting",
    "Fan hook at proper position before sheet fitting",
    "POP sheet fitted & every joint properly filled without undulation",
    "Each & every dhar of POP in line, level, plumb & right angle",
    // Electric Hole Cutting
    "Hole cutting of sheet as per ceiling light size & in proper manner",
];

const POPForm = ({ data, setData }) => {
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

export default POPForm;
