// frontend/src/pages/Vendor/VendorForm.jsx

import React from 'react';
import { Form, Input, InputNumber, Button, Row, Col } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import DynamicForm from '@/forms/DynamicForm';
import { fields } from './config';
import { useSelector } from 'react-redux';
import { selectUpdatedItem } from '@/redux/crud/selectors';

export default function VendorForm({ isUpdateForm = false }) {
  const form = Form.useFormInstance();
  const { current } = useSelector(selectUpdatedItem);

  React.useEffect(() => {
    if (isUpdateForm && current) {
      // Ensure labourSupplyDetails is initialized as an array
      const updates = {
        ...current,
        labourSupplyDetails: current.labourSupplyDetails || [],
      };
      form.setFieldsValue(updates);
    }
  }, [current, isUpdateForm, form]);

  return (
    <>
      <DynamicForm fields={fields} isUpdateForm={isUpdateForm} />

      <Form.Item
        label="Labour Supply Details"
        style={{ marginTop: 16 }}
      >
        <Form.List name="labourSupplyDetails">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <Row key={field.key} gutter={[16, 0]} align="middle" style={{ marginBottom: 8 }}>
                  <Col span={14}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'labourType']}
                      rules={[{ required: true, message: 'Please enter labour type' }]}
                    >
                      <Input placeholder="e.g. Electrician, Mason" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'count']}
                      rules={[{ required: true, message: 'Please enter quantity' }]}
                    >
                      <InputNumber
                        placeholder="Qty"
                        min={0}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    {fields.length > 0 && (
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    )}
                  </Col>
                </Row>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  Add Labour Category
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form.Item>
    </>
  );
}
