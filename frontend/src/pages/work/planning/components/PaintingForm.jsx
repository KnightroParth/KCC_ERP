import React from 'react';
import { Table, Checkbox, Input } from 'antd';

const CHECK_POINTS = [
    // Grinding & Putti-1
    "Ghasai work completed",
    "1st coat putti work properly done",
    "All adjacent work completed before putti",
    "Scaffolding is safe and scratch free",
    "Surface wetted before putty application",
    "Wall surface free from dead mortar, dust, nails, oil, grease",
    "Check for efflorescence",
    "Application done on entire area including skirting, notch, openings",
    "Cracks filled by making 'V' groove and sealing",
    // Putti-2 & Primer
    "2nd coat putti work properly done",
    "After crack filling and ghasai, primer applied",
    "Surface after 2nd coat putty is even",
    "Sanding done before primer application",
    "Primer consistency applied on walls and ceiling",
    // Paint Coat-1 & Coat-2
    "Material confirmed to approved shade/make",
    "Primer application (alkali resistance) and mixing ratio correct",
    "Paint mixing ratio correct",
    "Surface checked for undulation before painting",
    "All edges of plaster/RCC work in line and level post painting",
    "Uniform application on all walls, no shade variation",
    "No roller/brush marks observable",
    // Oil Paint
    "Excess material removed from chaukat and grill",
    "Primer applied on door frames, grills, railings",
    "Oil paint on door frames, grills, railings",
    // Cleaning
    "Paint marks cleaned from windows, floor, etc.",
    "Door frame and window grills and flat cleaned after colouring",
    "No colour variation observed",
];

const PaintingForm = ({ data, setData }) => {
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

export default PaintingForm;
