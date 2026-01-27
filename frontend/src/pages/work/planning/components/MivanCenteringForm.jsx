import React from 'react';
import { Table, Checkbox } from 'antd';

const CHECK_POINTS = [
    "Start Level",
    "Reference Line - T",
    "Plumb (Gola)",
    "Wall Alignment",
    "Wall Tie",
    "Pin Lineage",
    "Window Opening",
    "Room Measurement",
    "Door Opening Measurement",
    "All Corner 90",
    "Proper Rocker Fixing",
    "Props in proper position",
    "No damage panel",
    "Slab Level Checking",
    "Outside centering",
    "All outer Kicker alignment",
    "Solder Ring",
    "Main rain sunk Alignment and measurement",
    "100mm Chairs for sunk",
    "Lift Plumb",
    "Lift Line",
    "Lift Diagonal",
    "Lift All Corner 90",
    "Lift Kicker Line",
    "Passage Opening Measurement",
    "Passenger/Duct Opening Kicker Alignment measurement/support"
];

const ROOMS = [
    { name: 'Hall', keys: ['N', 'S', 'E', 'W'] },
    { name: 'Kitchen', keys: ['N', 'S', 'E', 'W'] },
    { name: 'MBedroom', keys: ['N', 'S', 'E', 'W'] },
    { name: 'CBedroom', keys: ['N', 'S', 'E', 'W'] },
    { name: 'C.Toilet', keys: ['N', 'S', 'E', 'W'] },
    { name: 'Att.Toilet', keys: ['N', 'S', 'E', 'W'] },
    { name: 'Wash up', keys: ['N', 'S', 'E', 'W'] },
    { name: 'Lobby', keys: ['N', 'S', 'E', 'W'] },
    { name: 'Lift', keys: ['N', 'S', 'E', 'W'] },
    { name: 'Passage', keys: ['N', 'S', 'E', 'W'] },
    { name: 'Stairs', keys: ['Steps', 'Side'] },
];

const MivanCenteringForm = ({ data, setData }) => {
    // Data structure: data.rows = { "Start Level": { "Hall_N": true, "Hall_S": false... } }
    const rowData = data.rows || {};

    const handleCheck = (rowKey, colKey, checked) => {
        const currentRow = rowData[rowKey] || {};
        const updatedRow = { ...currentRow, [colKey]: checked };
        const updatedRows = { ...rowData, [rowKey]: updatedRow };
        setData({ ...data, rows: updatedRows });
    };

    const dataSource = CHECK_POINTS.map((point, index) => ({
        key: point,
        srNo: index + 1,
        point: point,
    }));

    const columns = [
        {
            title: 'Sr. No',
            dataIndex: 'srNo',
            width: 70,
            fixed: 'left',
        },
        {
            title: 'Check Point',
            dataIndex: 'point',
            width: 250,
            fixed: 'left',
        },
        ...ROOMS.map(room => ({
            title: room.name,
            children: room.keys.map(k => ({
                title: k,
                width: 70,
                render: (_, record) => (
                    <Checkbox
                        checked={rowData[record.key]?.[`${room.name}_${k}`]}
                        onChange={e => handleCheck(record.key, `${room.name}_${k}`, e.target.checked)}
                    />
                )
            }))
        }))
    ];

    return (
        <Table
            dataSource={dataSource}
            columns={columns}
            pagination={false}
            scroll={{ x: 3800, y: 600 }}
            size="small"
            bordered
        />
    );
};

export default MivanCenteringForm;
