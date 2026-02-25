import React from 'react';
import { Table, Checkbox, Input } from 'antd';

const CHECK_POINTS = [
    // Common tile checks
    "2' level marking on every room corner",
    "All room tile level (00 level)",
    "All room tile fitting as per drawing, joint in line & level",
    "No damaged tile fitting in any room",
    "Room cleaned after tile fitting",
    "Floor & glazed tile properly acid washed and joint filling completed",
    // Skirting
    "Skirting in line, level, right angle & even size (3\")",
    // Floor slope
    "Flooring slope towards Nani trap (1\")",
    "Wash floor tile 1\" below kitchen floor tile at chaukat",
    "Flooring tile around trap 4mm below floor tile",
    // Wall tile
    "Glazed tile in plumb & corner in 90 degrees",
    "Wall tile weber not more than 6mm",
    "Wall tile in line & level",
    "Joint properly filled around every plumbing point",
    // Acid Wash
    "All room floor & glazed tile properly acid washed",
    "After acid wash, joints properly filled",
    "All rooms properly cleaned after joint filling",
    // Window Seal
    "All window sill fitting in line & level",
    "Window sill granite polish done in proper finish",
    "Window sill 4mm outside inner face of wall",
    "Outside sloping galtha provided at window sill",
    // Kadapa Rack
    "Marking on wall as per drawing",
    "All ziri depth not less than 10mm",
    "All kadappa fitting as per drawing",
    "Kadappa vertical stand in right angle, plumb, line & level",
    "Kadappa shelf in line & level",
    "All kadappa edges properly polished",
    "All ziri smooth finish after kadappa fitting",
    // Kitchen Otta
    "Kadappa vertical stand fitting as per drawing in right angle, plumb, line & level",
    "Marble/Granite fitted with slope towards steel sink",
    "Steel sink fitting below granite top",
    "Water patti with polish in single piece with proper joint filling",
    "1.25\" PVC bend fitting for gas pipe with proper joint filling",
];

const TilesExtraForm = ({ data, setData }) => {
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

export default TilesExtraForm;
