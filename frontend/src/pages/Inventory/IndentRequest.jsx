import React, { useEffect } from 'react';
import { Form, InputNumber, Button, Table, Tag, Badge, DatePicker, Select, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { selectCurrentItem } from '@/redux/crud/selectors';
import useLanguage from '@/locale/useLanguage';

function IndentRequestForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  
  // --- 1. LIVE CALCULATIONS ---
  // Watch 'items' to trigger updates
  const items = Form.useWatch('items', form) || [];

  // Calculate Total Cost
  const estimatedCost = items.reduce((sum, item) => {
    if (!item) return sum;
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.estimatedRate) || 0;
    return sum + (qty * rate);
  }, 0);

  const budgetWarning = estimatedCost > 100000 ? 'High value request - may require approval' : '';

  // --- 2. DATA LOADING ---
  const { result: currentItem } = useSelector(selectCurrentItem);

  useEffect(() => {
    if (isUpdateForm && currentItem) {
      try {
        const formattedData = { ...currentItem };

        // Fix Date
        if (formattedData.requiredDate) {
          formattedData.requiredDate = dayjs(formattedData.requiredDate);
        } else {
          formattedData.requiredDate = null;
        }

        // Fix Project ID
        if (formattedData.projectId && typeof formattedData.projectId === 'object') {
          formattedData.projectId = formattedData.projectId._id;
        }

        // Fix Items: Keep the FULL OBJECT for material to ensure display label works
        if (Array.isArray(formattedData.items)) {
          formattedData.items = formattedData.items.map(item => ({
             ...item,
             // KEY FIX: Do NOT extract ._id here. Keep the object.
             material: item.material 
          }));
        } else {
          formattedData.items = [];
        }

        form.resetFields(); 
        form.setFieldsValue(formattedData);
      } catch (error) {
        console.error("Error populating form:", error);
      }
    } else if (!isUpdateForm) {
      form.resetFields();
      form.setFieldsValue({ items: [] });
    }
  }, [isUpdateForm, currentItem, form]);

  return (
    <div style={{ paddingRight: 10 }}>
      <div style={{ display: 'flex', gap: '15px' }}>
        <Form.Item
          label="Project"
          name="projectId"
          rules={[{ required: true, message: 'Please select a project' }]}
          style={{ flex: 1 }}
        >
          <SelectAsync
            entity="project"
            displayLabels={['name', 'projectCode']}
            outputValue="_id"
            placeholder="Select Project"
          />
        </Form.Item>

        <Form.Item
          label="Required Date"
          name="requiredDate"
          rules={[{ required: true }]}
          style={{ flex: 1 }}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
      </div>

      <Form.Item
        label="Priority"
        name="priority"
        rules={[{ required: true }]}
        initialValue="Medium"
      >
        <Select>
          <Select.Option value="Low">Low</Select.Option>
          <Select.Option value="Medium">Medium</Select.Option>
          <Select.Option value="High">High</Select.Option>
          <Select.Option value="Urgent">Urgent</Select.Option>
        </Select>
      </Form.Item>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <Form.Item label="Material List" required>
            <Table
              // FIX: Merge 'fields' with 'items' to ensure row re-renders on value change
              dataSource={fields.map(field => ({
                ...field,
                ...(items[field.name] || {})
              }))}
              pagination={false}
              size="small"
              rowKey="key" 
              scroll={{ x: 'max-content' }}
              columns={[
                {
                  title: 'Material',
                  dataIndex: 'material',
                  width: 250,
                  render: (_, field) => {
                    // Get the current material value (Object or ID)
                    const currentMaterial = items[field.name]?.material;
                    // Generate a unique key to force re-render when material changes
                    const uniqueKey = currentMaterial?._id || currentMaterial || 'empty';

                    return (
                      <Form.Item
                        {...field}
                        name={[field.name, 'material']} 
                        rules={[{ required: true, message: 'Required' }]}
                        style={{ margin: 0 }}
                      >
                        <AutoCompleteAsync
                          key={uniqueKey} // FIX: Force component reset on change
                          entity="material"
                          displayLabels={['name', 'category']}
                          searchFields="name,category"
                          // FIX: Remove outputValue="_id". We store the full Object now.
                          // outputValue="_id" 
                          placeholder="Search Material"
                          onChange={(val) => {
                             // Set the full object value to the form
                             form.setFieldValue(['items', field.name, 'material'], val);
                          }}
                          value={currentMaterial}
                        />
                      </Form.Item>
                    );
                  },
                },
                {
                  title: 'Qty',
                  dataIndex: 'quantity',
                  width: 100,
                  render: (_, field) => (
                    <Form.Item
                      {...field}
                      name={[field.name, 'quantity']}
                      rules={[{ required: true }]}
                      style={{ margin: 0 }}
                    >
                      <InputNumber min={0.01} placeholder="Qty" style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: 'Rate',
                  dataIndex: 'estimatedRate',
                  width: 120,
                  render: (_, field) => (
                    <Form.Item
                      {...field}
                      name={[field.name, 'estimatedRate']}
                      style={{ margin: 0 }}
                    >
                      <InputNumber min={0} prefix="₹" placeholder="Rate" style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: '',
                  width: 50,
                  fixed: 'right',
                  render: (_, field) => (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  ),
                },
              ]}
              footer={() => (
                <Button 
                  type="dashed" 
                  onClick={() => add({ quantity: 1, estimatedRate: 0 })} 
                  block 
                  icon={<PlusOutlined />}
                >
                  Add Material
                </Button>
              )}
            />
          </Form.Item>
        )}
      </Form.List>

      {estimatedCost > 0 && (
        <div style={{ 
          marginBottom: 20, 
          padding: '10px', 
          background: '#f6ffed', 
          border: '1px solid #b7eb8f', 
          borderRadius: '6px' 
        }}>
          <strong>Total Est. Cost: </strong>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#389e0d' }}>
            ₹{estimatedCost.toLocaleString('en-IN')}
          </span>
          {budgetWarning && (
            <div style={{ color: '#faad14', marginTop: 5, fontSize: '12px' }}>
              ⚠️ {budgetWarning}
            </div>
          )}
        </div>
      )}

      <Form.Item label="Notes" name="notes">
        <Input.TextArea rows={3} placeholder="Additional notes..." />
      </Form.Item>
    </div>
  );
}

export default function IndentRequest() {
  const searchConfig = {
    displayLabels: ['priority'],
    searchFields: 'notes',
  };

  const deleteModalLabels = ['priority'];

  const tableActions = {
    showEdit: true,
    showDelete: true,
    position: 'right',
  };

  const dataTableColumns = [
    {
      title: 'Project',
      dataIndex: ['projectId', 'name'], 
      key: 'project',
      render: (text, record) => {
        if (record.projectId && record.projectId.name) {
            return <span style={{ fontWeight: 600 }}>{record.projectId.name}</span>;
        }
        if (record.projectId && typeof record.projectId === 'string') {
           return <span>{record.projectId}</span>; 
        }
        return <span style={{ color: '#ccc' }}>N/A</span>;
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => {
        let color = 'blue';
        if (priority === 'High') color = 'orange';
        if (priority === 'Urgent') color = 'red';
        return <Tag color={color}>{priority || 'Medium'}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'Approved') color = 'green';
        if (status === 'Pending') color = 'gold';
        return <Tag color={color}>{status || 'Pending'}</Tag>;
      },
    },
    {
      title: 'Req. Date',
      dataIndex: 'requiredDate', 
      key: 'requiredDate',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, record) => (
        <Badge count={record.items?.length || 0} style={{ backgroundColor: '#52c41a' }} />
      ),
    },
  ];

  const config = {
    entity: 'inventory/requirement',
    PANEL_TITLE: 'Indent Request',
    DATATABLE_TITLE: 'Requests List',
    ADD_NEW_ENTITY: 'Create Request',
    ENTITY_NAME: 'Indent Request',
    fields: {},
    searchConfig,
    deleteModalLabels,
    tableActions,
    dataTableColumns,
  };

  return (
    <CrudModule
      config={config}
      createForm={<IndentRequestForm />}
      updateForm={<IndentRequestForm isUpdateForm={true} />}
    />
  );
}