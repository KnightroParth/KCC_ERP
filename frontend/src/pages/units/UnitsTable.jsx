import React, { useState } from 'react';
import { Table, Button, Space, Tag, message, Modal, Form, Input, InputNumber, Select } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { request } from '@/request';

export default function UnitsTable({ data, onRefresh }) {
    const [form] = Form.useForm();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { Option } = Select;

    const handleDelete = async (record) => {
        try {
            const result = await request.delete({ entity: 'unit', id: record._id });
            if (result.success) {
                message.success('Unit deleted successfully');
                if (onRefresh) onRefresh();
            } else {
                message.error('Failed to delete unit');
            }
        } catch (error) {
            console.error('Delete error:', error);
            message.error('An error occurred while deleting unit');
        }
    };

    const handleEdit = (record) => {
        setEditingUnit(record);
        form.setFieldsValue({
            floorNumber: record.floorNumber,
            unitNumber: record.unitNumber,
            unitType: record.unitType,
            areaSqft: record.areaSqft,
            basePrice: record.basePrice,
            status: record.status,
            buyerName: record.buyerName,
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (values) => {
        try {
            setSubmitting(true);
            const result = await request.update({
                entity: 'unit',
                id: editingUnit._id,
                jsonData: values
            });

            if (result.success) {
                message.success('Unit updated successfully');
                form.resetFields();
                setIsEditModalOpen(false);
                setEditingUnit(null);
                if (onRefresh) onRefresh();
            } else {
                message.error('Failed to update unit');
            }
        } catch (error) {
            console.error('Update error:', error);
            message.error('An error occurred while updating unit');
        } finally {
            setSubmitting(false);
        }
    };

    const statusColors = {
        Available: 'green',
        Booked: 'orange',
        Sold: 'red',
    };

    const columns = [
        {
            title: 'Floor',
            dataIndex: 'floorNumber',
            key: 'floorNumber',
            width: 80,
            sorter: (a, b) => (parseInt(a.floorNumber) || 0) - (parseInt(b.floorNumber) || 0),
        },
        {
            title: 'Unit Number',
            dataIndex: 'unitNumber',
            key: 'unitNumber',
            width: 120,
            sorter: (a, b) => {
                const numA = parseInt(a.unitNumber.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.unitNumber.replace(/\D/g, '')) || 0;
                return numA - numB;
            },
        },
        {
            title: 'Unit Type',
            dataIndex: 'unitType',
            key: 'unitType',
            width: 100,
            render: (text) => text || '-',
            filters: [
                { text: '1 BHK', value: '1BHK' },
                { text: '2 BHK', value: '2BHK' },
                { text: '3 BHK', value: '3BHK' },
                { text: '4 BHK', value: '4BHK' },
                { text: 'Studio', value: 'Studio' },
                { text: 'Penthouse', value: 'Penthouse' },
                { text: 'Shop', value: 'Shop' },
                { text: 'Office', value: 'Office' },
                { text: 'Other', value: 'Other' },
            ],
            onFilter: (value, record) => record.unitType === value,
        },
        {
            title: 'Area (Sq Ft)',
            dataIndex: 'areaSqft',
            key: 'areaSqft',
            width: 130,
            render: (text) => text ? text.toLocaleString('en-IN') : '-',
        },
        {
            title: 'Base Price',
            dataIndex: 'basePrice',
            key: 'basePrice',
            width: 130,
            render: (text) => text ? `₹ ${text.toLocaleString('en-IN')}` : '-',
        },
        {
            title: 'Buyer Name',
            dataIndex: 'buyerName',
            key: 'buyerName',
            width: 150,
            render: (text) => text || '-',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => (
                <Tag color={statusColors[status] || 'blue'}>
                    {status}
                </Tag>
            ),
            filters: [
                { text: 'Available', value: 'Available' },
                { text: 'Booked', value: 'Booked' },
                { text: 'Sold', value: 'Sold' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small" wrap>
                    <Button
                        size="small"
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />

                    <Button
                        size="small"
                        danger
                        type="primary"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record)}
                        style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }}
                    />
                </Space>
            ),
        },
    ];

    return (
        <>
            <Table
                columns={columns}
                dataSource={data}
                rowKey="_id"
                style={{ marginTop: 20 }}
                pagination={{ pageSize: 20 }}
                scroll={{ x: 'max-content', y: 600 }}
                footer={() => (
                    <div style={{ textAlign: 'right', fontWeight: 600, paddingRight: 12 }}>
                        Total Units: {Array.isArray(data) ? data.length : 0}
                    </div>
                )}
                size="middle"
                bordered
            />

            {/* Edit Unit Modal */}
            <Modal
                title="Edit Unit"
                open={isEditModalOpen}
                onCancel={() => {
                    setIsEditModalOpen(false);
                    setEditingUnit(null);
                    form.resetFields();
                }}
                footer={null}
                width={500}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleEditSubmit}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="floorNumber"
                        label="Floor Number"
                        rules={[{ required: true, message: 'Please enter floor number' }]}
                    >
                        <Input placeholder="e.g., 5" />
                    </Form.Item>

                    <Form.Item
                        name="unitNumber"
                        label="Unit Number"
                        rules={[{ required: true, message: 'Please enter unit number' }]}
                    >
                        <Input placeholder="e.g., A-502" />
                    </Form.Item>

                    <Form.Item
                        name="unitType"
                        label="Unit Type"
                        rules={[{ required: true, message: 'Please select unit type' }]}
                    >
                        <Select placeholder="Select Unit Type">
                            <Option value="1BHK">1 BHK</Option>
                            <Option value="2BHK">2 BHK</Option>
                            <Option value="3BHK">3 BHK</Option>
                            <Option value="4BHK">4 BHK</Option>
                            <Option value="Studio">Studio</Option>
                            <Option value="Penthouse">Penthouse</Option>
                            <Option value="Shop">Shop</Option>
                            <Option value="Office">Office</Option>
                            <Option value="Other">Other</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="areaSqft"
                        label="Area (Sq Ft)"
                        rules={[{ required: true, message: 'Please enter area' }]}
                    >
                        <InputNumber min={0} step={0.01} placeholder="e.g., 1220" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="basePrice"
                        label="Base Price"
                        rules={[{ required: true, message: 'Please enter base price' }]}
                    >
                        <InputNumber min={0} step={0.01} placeholder="e.g., 5000" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="status"
                        label="Status"
                        rules={[{ required: true, message: 'Please select status' }]}
                    >
                        <Select placeholder="Select Status">
                            <Option value="Available">Available</Option>
                            <Option value="Booked">Booked</Option>
                            <Option value="Sold">Sold</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="buyerName"
                        label="Buyer Name (Optional)"
                    >
                        <Input placeholder="Buyer name if sold" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => {
                                setIsEditModalOpen(false);
                                setEditingUnit(null);
                                form.resetFields();
                            }}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={submitting}
                            >
                                Update Unit
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
