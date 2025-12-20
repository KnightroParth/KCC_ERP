import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Button, Table, Tag, Badge, message, DatePicker, Select, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';

import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { selectCurrentItem } from '@/redux/crud/selectors';
import useLanguage from '@/locale/useLanguage';

function IndentRequestForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const [items, setItems] = useState([]);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [budgetWarning, setBudgetWarning] = useState('');

  const { result: currentItem } = useSelector(selectCurrentItem);

  useEffect(() => {
    if (isUpdateForm && currentItem) {
      // 1. Populate Items
      if (currentItem.items && currentItem.items.length > 0) {
        // Ensure keys exist for table
        const itemsWithKeys = currentItem.items.map((item, index) => ({
            ...item,
            key: item._id || item.key || Date.now() + index 
        }));
        setItems(itemsWithKeys);
        updateEstimatedCost(itemsWithKeys);
      }

      // 2. Populate Form Fields
      const updates = { ...currentItem };
      
      if (currentItem.requiredDate) {
        updates.requiredDate = dayjs(currentItem.requiredDate);
      }
      
      if (currentItem.projectId && typeof currentItem.projectId === 'object') {
        updates.projectId = currentItem.projectId._id;
      }

      // Sync Items to Form (Important for values inside table inputs)
      updates.items = items;

      form.setFieldsValue(updates);
    }
  }, [isUpdateForm, currentItem, form]);

  const addItem = () => {
    const newItem = {
      key: Date.now(),
      material: null,
      quantity: 1,
      notes: '',
      estimatedRate: 0,
    };
    const newItems = [...items, newItem];
    setItems(newItems);
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
        if (record.projectId && record.projectId.name) {
            return <span style={{ fontWeight: 600 }}>{record.projectId.name}</span>;
        }
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
      // FIX: Changed from 'requestDate' to 'requiredDate' to match DB
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