import React from 'react';
import { Table, Checkbox, Input } from 'antd';

const CHECK_POINTS = [
    "Check all grill/ventilator size and design as per drawing",
    "Primer coat done before fitting of all grill/ventilator",
    "Grinding of every welded joint properly smooth",
    "Grill/ventilator fitting 1\" inside from outer face of wall",
    "Grill fitting hole broken properly",
    "Grill level checked by tube level",
    "Grill in line & plumb (gola)",
    "Filling hole proper level & finishing",
    // Railing
    "Balcony railing size as per drawing",
    "Railing primer coat done before fixing",
    "Railing welded joints properly ground smooth",
    "Railing fitting in line & plumb",
    "Railing hole filling with proper finishing",
];

const FabricationForm = ({ data, setData }) => {
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

export default FabricationForm;
