import React, { useState, useEffect } from 'react';
import { Layout, Table, InputNumber, Button, message, Card, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import request from '@/request/request';

const { Content } = Layout;

export default function SetRate() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchMaterials = async () => {
            setLoading(true);
            try {
                const res = await request.listAll({ entity: 'inventory/material' });
                if (res.success) {
                    setMaterials(res.result.map(m => ({
                        ...m,
                        price: m.price || 0
                    })));
                }
            } finally {
                setLoading(false);
            }
        };
        fetchMaterials();
    }, []);

    const handlePriceChange = (id, value) => {
        setMaterials(prev => prev.map(m => m._id === id ? { ...m, price: value } : m));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updatePromises = materials.map(m =>
                request.update({ entity: 'inventory/material', id: m._id, jsonData: { price: m.price } })
            );
            await Promise.all(updatePromises);
            message.success('Rates updated successfully');
        } catch (error) {
            message.error('Failed to update rates');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        { title: 'Material Name', dataIndex: 'name', key: 'name' },
        { title: 'Category', dataIndex: 'category', key: 'category' },
        { title: 'UOM', dataIndex: 'uom', key: 'uom' },
        {
            title: 'Set Rate (₹)',
            key: 'price',
            width: 150,
            render: (_, record) => (
                <InputNumber
                    min={0}
                    value={record.price}
                    onChange={(val) => handlePriceChange(record._id, val)}
                    style={{ width: '100%' }}
                />
            )
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>
            <Content style={{ padding: '32px 24px' }}>
                <div className="page-content-inner">
                    <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 className="page-title">Set Rates</h1>
                            <p style={{ color: '#8c8c8c' }}>Set prices for materials in the library</p>
                        </div>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSave}
                            loading={saving}
                            size="large"
                        >
                            Save Rates
                        </Button>
                    </div>

                    <Card bordered={false}>
                        <Table
                            columns={columns}
                            dataSource={materials}
                            rowKey="_id"
                            loading={loading}
                            pagination={false}
                        />
                    </Card>
                </div>
            </Content>
        </Layout>
    );
}
