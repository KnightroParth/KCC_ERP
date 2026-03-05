import React from 'react';
import { Table, Checkbox, Input } from 'antd';

const CHECK_POINTS = [
    // Zari Repairing & Testing
    "All Toilet, kitchen & washup internal pipe line testing by water pressure pump",
    "If any leakage found, repair and re-test after repairing",
    "All pipe line repaired with cement mortar to face of wall",
    // Nani Trap Fitting
    "Trap fitting after water proofing coating as per drawing",
    "Trap fitting with water proofing mortar",
    "Water leakage pipe fitting with slope towards outside",
    // Show Fitting
    "Water meter fitting",
    "Shower fitting",
    "Wall mixer fitting",
    "Trap jali fitting (gap between jali & trap properly filled with WP mortar)",
    "Commod fitting",
    "Two way bib cock fitting",
    "Cistern fitting",
    "Angle cock fitting",
    "Long body tap fitting",
    "Basin fitting",
    "Basin piller cock with PVC connection and basin outlet",
    "Sink tap fitting",
    "Sink outlet fitting",
    "Wash tap point fitting",
    "Washing machine tap fitting",
    "Washing machine outlet",
];

const PlumbingIExtraForm = ({ data, setData }) => {
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
        { title: 'Check Point', dataIndex: 'point', width: 320 },
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

export default PlumbingIExtraForm;
