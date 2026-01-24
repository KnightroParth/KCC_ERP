import React from 'react';
import { Table, Input, InputNumber, Button, DatePicker } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const SlabReinforcementForm = ({ data, setData }) => {
    const dataSource = Array.isArray(data?.rows) ? data.rows : [];

    const handleAdd = () => {
        const newRow = {
            key: Date.now(),
            beamNo: '',
            sizeL: null,
            sizeB: null,
            sizeCheck: null,
            bottomStraightNo: null,
            bottomStraightDia: null,
            bottomStraightDate: null,
            bottomNo: null,
            bottomDia: null,
            bottomDate: null,
            topStraightNo: null,
            topStraightDia: null,
            topStraightDate: null,
            extraLeftNo: null,
            extraLeftDia: null,
            extraLeftDate: null,
            extraBarNo: null,
            extraBarDia: null,
            extraBarDate: null,
            stirrupSupportDia: null,
            stirrupSupportSpa: null,
            stirrupSupportDate: null,
            stirrupMidDia: null,
            stirrupMidSpa: null,
            stirrupMidCheck: null,
            coverSide: null,
            coverBottom: null,
            checkDate: null,
            remark: '',
        };
        setData({ ...data, rows: [...dataSource, newRow] });
    };

    const handleDelete = (key) => {
        const newData = dataSource.filter((item) => item.key !== key);
        setData({ ...data, rows: newData });
    };

    const handleChange = (key, field, value) => {
        const newData = dataSource.map((item) => {
            if (item.key === key) {
                return { ...item, [field]: value };
            }
            return item;
        });
        setData({ ...data, rows: newData });
    };

    // Helper to create column group with No. Bar., dia. of bar, Check Date
    const createCol = (title, fieldPrefix, width = 80, type = 'number') => ({
        title,
        children: [
            {
                title: 'No. Bar.',
                dataIndex: `${fieldPrefix}No`,
                width: 90,
                align: 'center',
                render: (text, record) => <InputNumber size="small" style={{ width: '100%' }} value={text} onChange={v => handleChange(record.key, `${fieldPrefix}No`, v)} />
            },
            {
                title: 'dia. of bar',
                dataIndex: `${fieldPrefix}Dia`,
                width: 100,
                align: 'center',
                render: (text, record) => <InputNumber size="small" style={{ width: '100%' }} value={text} onChange={v => handleChange(record.key, `${fieldPrefix}Dia`, v)} />
            },
            {
                title: 'Check Date',
                dataIndex: `${fieldPrefix}Date`,
                width: 140,
                align: 'center',
                render: (text, record) => <DatePicker size="small" style={{ width: '100%' }} value={text && dayjs(text).isValid() ? dayjs(text) : null} onChange={(d) => handleChange(record.key, `${fieldPrefix}Date`, d ? d.toISOString() : null)} format="DD/MM/YYYY" />
            },
        ]
    });

    const columns = [
        {
            title: 'Sr. No',
            render: (text, record, index) => index + 1,
            width: 70,
            align: 'center',
            fixed: 'left',
        },
        {
            title: 'Beam No.',
            dataIndex: 'beamNo',
            width: 120,
            align: 'center',
            fixed: 'left',
            render: (text, record) => <Input size="small" style={{ width: '100%' }} value={text} onChange={e => handleChange(record.key, 'beamNo', e.target.value)} />
        },
        {
            title: 'Beam Size',
            children: [
                { title: 'L', dataIndex: 'sizeL', width: 90, align: 'center', render: (t, r) => <InputNumber size="small" style={{ width: '100%' }} value={t} onChange={v => handleChange(r.key, 'sizeL', v)} /> },
                { title: 'B', dataIndex: 'sizeB', width: 90, align: 'center', render: (t, r) => <InputNumber size="small" style={{ width: '100%' }} value={t} onChange={v => handleChange(r.key, 'sizeB', v)} /> },
                { title: 'Check Date', dataIndex: 'sizeCheck', width: 140, align: 'center', render: (t, r) => <DatePicker size="small" style={{ width: '100%' }} value={t && dayjs(t).isValid() ? dayjs(t) : null} onChange={(d) => handleChange(r.key, 'sizeCheck', d ? d.toISOString() : null)} format="DD/MM/YYYY" /> },
            ]
        },
        {
            title: 'Bottom Reinforcement',
            children: [
                createCol('Bottom Straight', 'bottomStraight'),
                createCol('Bottom', 'bottom'),
            ]
        },
        {
            title: 'Top Reinforcement',
            children: [
                createCol('Top Straight', 'topStraight'),
                createCol('Extra Bar Left', 'extraLeft'),
                createCol('Extra Bar', 'extraBar'),
            ]
        },
        {
            title: 'Stirrups',
            children: [
                {
                    title: 'At Support = L/4',
                    children: [
                        { title: 'dia. of Stirrups', width: 110, align: 'center', dataIndex: 'stirrupSupportDia', render: (t, r) => <InputNumber size="small" style={{ width: '100%' }} value={t} onChange={v => handleChange(r.key, 'stirrupSupportDia', v)} /> },
                        { title: 'Spacing of Stirrups', width: 120, align: 'center', dataIndex: 'stirrupSupportSpa', render: (t, r) => <InputNumber size="small" style={{ width: '100%' }} value={t} onChange={v => handleChange(r.key, 'stirrupSupportSpa', v)} /> },
                        { title: 'Check Date', width: 140, align: 'center', dataIndex: 'stirrupSupportDate', render: (t, r) => <DatePicker size="small" style={{ width: '100%' }} value={t && dayjs(t).isValid() ? dayjs(t) : null} onChange={(d) => handleChange(r.key, 'stirrupSupportDate', d ? d.toISOString() : null)} format="DD/MM/YYYY" /> },
                    ]
                },
                {
                    title: 'At Mid Span',
                    children: [
                        { title: 'dia. of Stirrups', width: 110, align: 'center', dataIndex: 'stirrupMidDia', render: (t, r) => <InputNumber size="small" style={{ width: '100%' }} value={t} onChange={v => handleChange(r.key, 'stirrupMidDia', v)} /> },
                        { title: 'Spacing of Stirrups', width: 120, align: 'center', dataIndex: 'stirrupMidSpa', render: (t, r) => <InputNumber size="small" style={{ width: '100%' }} value={t} onChange={v => handleChange(r.key, 'stirrupMidSpa', v)} /> },
                        { title: 'Check Date', width: 140, align: 'center', dataIndex: 'stirrupMidCheck', render: (t, r) => <DatePicker size="small" style={{ width: '100%' }} value={t && dayjs(t).isValid() ? dayjs(t) : null} onChange={(d) => handleChange(r.key, 'stirrupMidCheck', d ? d.toISOString() : null)} format="DD/MM/YYYY" /> },
                    ]
                }
            ]
        },
        {
            title: 'Cover',
            children: [
                { title: 'Side cover', width: 100, align: 'center', dataIndex: 'coverSide', render: (t, r) => <InputNumber size="small" style={{ width: '100%' }} value={t} onChange={v => handleChange(r.key, 'coverSide', v)} /> },
                { title: 'Bottom cover', width: 110, align: 'center', dataIndex: 'coverBottom', render: (t, r) => <InputNumber size="small" style={{ width: '100%' }} value={t} onChange={v => handleChange(r.key, 'coverBottom', v)} /> },
            ]
        },
        {
            title: 'Check Date',
            dataIndex: 'checkDate',
            width: 140,
            align: 'center',
            render: (t, r) => <DatePicker size="small" style={{ width: '100%' }} value={t && dayjs(t).isValid() ? dayjs(t) : null} onChange={(d) => handleChange(r.key, 'checkDate', d ? d.toISOString() : null)} format="DD/MM/YYYY" />
        },
        {
            title: 'Remark',
            dataIndex: 'remark',
            width: 250,
            align: 'center',
            render: (text, record) => <Input.TextArea size="small" style={{ width: '100%' }} autoSize value={text} onChange={e => handleChange(record.key, 'remark', e.target.value)} />
        },
        {
            title: 'Action',
            key: 'action',
            width: 80,
            align: 'center',
            render: (_, record) => (
                <Button
                    type="primary"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => handleDelete(record.key)}
                />
            ),
        },
    ];

    return (
        <div>
            <Table
                dataSource={dataSource}
                columns={columns}
                pagination={false}
                scroll={{ x: 4500, y: 500 }}
                size="small"
                bordered
            />
            <Button type="dashed" onClick={handleAdd} block icon={<PlusOutlined />} style={{ marginTop: 16 }}>
                Add Beam Row
            </Button>
        </div>
    );
};

export default SlabReinforcementForm;
