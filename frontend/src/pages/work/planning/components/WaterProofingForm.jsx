import React from 'react';
import { Table, Checkbox, Input } from 'antd';

const CHECK_POINTS = [
    // Chipping & First Coat
    "Chipping of Beam 2\" below from Slab Top",
    "Cleaning & Washing with water",
    "Chemical coating applied",
    "Leakage pipe fitting done",
    "Nhani Trap & Commod trap fitting",
    "1st coat cement ghotai chemical water proofing plaster",
    "Water leakage test done",
    // Koba Final Coat
    "Brick bats Koba fitting in water proofing cement mortar",
    "Koba finishing with cement ghotai plaster (slope towards trap)",
    "Final wall & floor in right angle and min 1.5\" below slab top",
    "Final testing",
];

const WaterProofingForm = ({ data, setData }) => {
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

export default WaterProofingForm;
