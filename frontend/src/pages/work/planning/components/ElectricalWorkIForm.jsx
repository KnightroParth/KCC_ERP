import React from 'react';
import { Table, Checkbox, Input, DatePicker } from 'antd';
import dayjs from 'dayjs';

const CHECKPOINTS_BY_TASK = {
    "Slab Piping": [
        "D.B to S.B Pipe drop + S.B. to point pipe drop + D.B. to meter pipe drop as per drawing",
        "Pipe fitting should be 1/2\" inside the wall face",
        "Fan hook center position should be after deduction of loft width",
        "Every pipe & bend should be fix with pvc solution",
        "Every pipe end should be properly close with tape",
        "Check every point position as per drawing or not"
    ],
    "Conselled box fitting": [
        "Conselled box bottom level 54\" from FFL fitting in line"
    ],
    "Block Wiring": [
        "point+earthing wire=1.5, mcb box to SB board=2.5, amp point=2.5",
        "Check every point wiring at proper position as per drawing",
        "Wiring from D.B to S.B. + S.B. to light point/fan point + D.B. to meter pipe drop as per drawing",
        "TV wiring done or not",
        "Inverter/AC wiring if required",
        "All repairing related to electric work should be in proper finish"
    ],
    "Switch Plate fitting": [
        "Every plate fitting should be in line & level",
        "Every wire should be join properly tight & and in sequence"
    ],
    "Testing Repair & Finish": [
        "Testing of each and every point is in active position"
    ]
};

const ElectricalWorkIForm = ({ data, setData, currentTask }) => {
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

export default ElectricalWorkIForm;
