import React, { useEffect, useState } from 'react';
import { Form, Checkbox, Button, Row, Col, Card, message } from 'antd';
import { assignWork } from '@/request/assignWork';

export default function WorkForm({ fields, selectedProject, selectedCategory, onSuccess }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        form.resetFields();
    }, [fields, selectedProject, selectedCategory, form]);

    const onFinish = async (values) => {
        if (!selectedProject || !selectedCategory) return;

        setLoading(true);
        const result = await assignWork.create({
            projectId: selectedProject._id,
            workCode: selectedCategory.id,
            values: values.workItems,
        });
        setLoading(false);

        if (result.success) {
            // message.success('Work assigned successfully!'); // Handled by request.js successHandler
            form.resetFields();
            if (onSuccess) onSuccess();
        }
    };

    if (!selectedProject || !selectedCategory) {
        return (
            <Card style={{ textAlign: 'center', marginTop: 20 }}>
                <p>Please select a Project and Work Category to start assigning work.</p>
            </Card>
        );
    }

    return (
        <Card title={`Assign Work: ${selectedCategory.label}`} style={{ marginTop: 20 }}>
            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item
                    name="workItems"
                    label="Select Work Items"
                    rules={[{ required: true, message: 'Please select at least one work item' }]}
                >
                    <Checkbox.Group style={{ width: '100%' }}>
                        <Row gutter={[16, 16]}>
                            {fields.map((field) => (
                                <Col span={8} key={field}>
                                    <Checkbox value={field}>{field}</Checkbox>
                                </Col>
                            ))}
                        </Row>
                    </Checkbox.Group>
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Save Selection
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
}
