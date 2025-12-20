import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Button, Table, Tag, Badge, message, DatePicker, Select, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux'; // ✅ Import Redux hooks
import dayjs from 'dayjs'; // ✅ Import Dayjs for Date handling

import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { selectCurrentItem } from '@/redux/crud/selectors'; // ✅ Import selector to get edit data
import useLanguage from '@/locale/useLanguage';

function IndentRequestForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const [items, setItems] = useState([]);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [budgetWarning, setBudgetWarning] = useState('');

  // ✅ Get the current item data from Redux (Standard way for this template)
  const { result: currentItem } = useSelector(selectCurrentItem);

  useEffect(() => {
    // Only run this logic if we are in "Edit" mode and have data
    if (isUpdateForm && currentItem) {
      
      // 1. POPULATE THE ITEMS TABLE
      if (currentItem.items && currentItem.items.length > 0) {
        setItems(currentItem.items);
        updateEstimatedCost(currentItem.items);
      }

      // 2. FIX FORM FIELDS (Dates & Selects)
      const updates = {};
      
      // Fix Date: Convert string to Dayjs object
      if (currentItem.requiredDate) {
        updates.requiredDate = dayjs(currentItem.requiredDate);
      }
      
      // Fix Project: Extract ID if it's an object (populated), otherwise use as is
      if (currentItem.projectId) {
        updates.projectId = typeof currentItem.projectId === 'object' 
          ? currentItem.projectId._id 
          : currentItem.projectId;
      }

      // Apply these specific fixes to the form
      form.setFieldsValue(updates);
    }
  }, [isUpdateForm, currentItem, form]);

  const addItem = () => {
    setItems([
      ...items,
      {
        key: Date.now(), // Unique key
        material: null,
        quantity: 1,
        notes: '',
        estimatedRate: 0,
      },
    ]);
  };

  const removeItem = (key) => {
    const newItems = items.filter((item) => item.key !== key);
    setItems(newItems);
    updateEstimatedCost(newItems);
  };

  const updateItem = (key, field, value) => {
    const newItems = items.map((item) => {
      if (item.key === key) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(newItems);
    updateEstimatedCost(newItems);
  };

  const updateEstimatedCost = (currentItems) => {
    const total = currentItems.reduce((sum, item) => {
      return sum + (item.estimatedRate || 0) * (item.quantity || 0);
    }, 0);
    setEstimatedCost(total);

    if (total > 100000) {
      setBudgetWarning('High value request - may require approval');
    } else {
      setBudgetWarning('');
    }
  };

  const columns = [
    {
      title: 'Material',
      key: 'material',
      width: 250,
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'material']}
          rules={[{ required: true, message: 'Required' }]}
          style={{ margin: 0 }}
        >
          <AutoCompleteAsync
            entity="material"
            displayLabels={['name', 'category']}
            searchFields="name,category"
            outputValue="_id"
            placeholder="Search Material"
            onChange={(value) => updateItem(record.key, 'material', value)}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Qty',
      key: 'quantity',
      width: 100,
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'quantity']}
          rules={[{ required: true }]}
          style={{ margin: 0 }}
        >
          <InputNumber
            min={0.01}
            placeholder="Qty"
            style={{ width: '100%' }}
            onChange={(value) => updateItem(record.key, 'quantity', value)}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Rate',
      key: 'estimatedRate',
      width: 120,
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'estimatedRate']}
          style={{ margin: 0 }}
        >
          <InputNumber
            min={0}
            placeholder="Rate"
            prefix="₹"
            style={{ width: '100%' }}
            onChange={(value) => updateItem(record.key, 'estimatedRate', value)}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.key)}
        />
      ),
    },
  ];

  return (
    <div style={{ paddingRight: 10 }}>
      <Form.Item
        label="Project"
        name="projectId"
        rules={[{ required: true, message: 'Please select a project' }]}
      >
        <SelectAsync
          entity="project"
          displayLabels={['name', 'projectCode']}
          outputValue="_id"
          placeholder="Select Project"
        />
      </Form.Item>

      <div style={{ display: 'flex', gap: '15px' }}>
        <Form.Item
          label="Required Date"
          name="requiredDate"
          rules={[{ required: true }]}
          style={{ flex: 1 }}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          label="Priority"
          name="priority"
          rules={[{ required: true }]}
          initialValue="Medium"
          style={{ flex: 1 }}
        >
          <Select>
            <Select.Option value="Low">Low</Select.Option>
            <Select.Option value="Medium">Medium</Select.Option>
            <Select.Option value="High">High</Select.Option>
            <Select.Option value="Urgent">Urgent</Select.Option>
          </Select>
        </Form.Item>
      </div>

      <Form.Item label="Material List" required>
        {/* Pass items to dataSource so the table renders the correct number of rows */}
        <Table
          dataSource={items}
          columns={columns}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          footer={() => (
            <Button type="dashed" onClick={addItem} block icon={<PlusOutlined />}>
              Add Material
            </Button>
          )}
        />
      </Form.Item>

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
        // Robust check: Ensure we can display the Project Name
        if (record.projectId && record.projectId.name) {
            return <span style={{ fontWeight: 600 }}>{record.projectId.name}</span>;
        }
        // Fallback if population failed but we have an ID
        if (record.projectId) return <span>{record.projectId}</span>;
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
      dataIndex: 'requestDate',
      key: 'requestDate',
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