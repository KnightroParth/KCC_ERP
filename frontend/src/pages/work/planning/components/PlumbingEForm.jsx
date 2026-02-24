import React from 'react';
import { Table, Checkbox, Input } from 'antd';

const CHECK_POINTS = [
    // Rain Water
    "R.W. pipe min 1\" below terrace top finish level",
    "Every joint fitting with solution in proper manner",
    "Pipe line in line, level and proper clamping",
    "R.W. outlet pipe up to R.W. Harvesting pit",
    // WC/Bath/Toilet/Wash pipe
    "WC/Bath/Toilet/Wash pipe line in line, level and proper clamping",
    "Every joint fitting with solution - WC/Wash pipes",
    "WC/Bath/Toilet/Wash pipe line up to sewerage line chamber",
    "Bath and Wash pipe line joined to sewerage chamber through Gulley trap",
    // Water Supply
    "Water supply pipe from OHWT to flat fitted to water meter (dia reduced as per drawing)",
    // Ground Water Tank to OHWT
    "GWT to OHWT HDPE pipe fitting done",
];

const PlumbingEForm = ({ data, setData }) => {
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

export default PlumbingEForm;
