// frontend/src/pages/Inventory/IndentRequest.jsx

import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Button, Table, Tag, Badge, message, DatePicker, Select, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';

function IndentRequestForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const [items, setItems] = useState([]);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [budgetWarning, setBudgetWarning] = useState('');

  useEffect(() => {
    if (isUpdateForm) {
      // Load existing items if updating
      const formValues = form.getFieldsValue();
      if (formValues.items) {
        setItems(formValues.items);
      }
    }
  }, [isUpdateForm, form]);

  const addItem = () => {
    setItems([
      ...items,
      {
        key: Date.now(),
        material: null,
        quantity: 1,
        notes: '',
        estimatedRate: 0,
      },
    ]);
  };

  const removeItem = (key) => {
    setItems(items.filter((item) => item.key !== key));
    updateEstimatedCost(items.filter((item) => item.key !== key));
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

    // Check budget (this would need projectId from form)
    const projectId = form.getFieldValue('projectId');
    if (projectId && total > 0) {
      // Budget check would be done on backend, but we can show a warning
      if (total > 100000) {
        setBudgetWarning('High value request - may require approval');
      } else {
        setBudgetWarning('');
      }
    }
  };

  const columns = [
    {
      title: 'Material',
      key: 'material',
      width: '40%',
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'material']}
          rules={[{ required: true, message: 'Select material' }]}
          style={{ margin: 0 }}
        >
          <AutoCompleteAsync
            entity="material"
            displayLabels={['name', 'category']}
            searchFields="name,category"
            outputValue="_id"
            placeholder="Search material..."
            onChange={(value) => updateItem(record.key, 'material', value)}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: '15%',
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'quantity']}
          rules={[{ required: true, message: 'Enter quantity' }]}
          style={{ margin: 0 }}
        >
          <InputNumber
            min={0.01}
            step={0.01}
            style={{ width: '100%' }}
            onChange={(value) => updateItem(record.key, 'quantity', value)}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Est. Rate',
      key: 'estimatedRate',
      width: '15%',
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'estimatedRate']}
          style={{ margin: 0 }}
        >
          <InputNumber
            min={0}
            step={0.01}
            style={{ width: '100%' }}
            onChange={(value) => updateItem(record.key, 'estimatedRate', value)}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Notes',
      key: 'notes',
      width: '20%',
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'notes']}
          style={{ margin: 0 }}
        >
          <Input placeholder="Optional notes" />
        </Form.Item>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: '10%',
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.key)}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <>
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

      <Form.Item
        label="Required Date"
        name="requiredDate"
        rules={[{ required: true, message: 'Please select required date' }]}
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

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

      <Form.Item label="Items" required>
        <Button
          type="dashed"
          onClick={addItem}
          icon={<PlusOutlined />}
          style={{ width: '100%', marginBottom: 16 }}
        >
          Add Material
        </Button>
        <Form.Item name="items" rules={[{ required: true, message: 'Add at least one item' }]}>
          <Table
            dataSource={items}
            columns={columns}
            pagination={false}
            size="small"
          />
        </Form.Item>
      </Form.Item>

      {estimatedCost > 0 && (
        <div style={{ marginBottom: 16 }}>
          <strong>Estimated Cost: </strong>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
            ₹{estimatedCost.toLocaleString('en-IN')}
          </span>
          {budgetWarning && (
            <Badge
              status="warning"
              text={budgetWarning}
              style={{ marginLeft: 16 }}
            />
          )}
        </div>
      )}

      <Form.Item label="Notes" name="notes">
        <Input.TextArea rows={3} placeholder="Additional notes..." />
      </Form.Item>
    </>
  );
}

export default function IndentRequest() {
  const entity = 'inventory/requirement';

  const searchConfig = {
    displayLabels: ['requestDate', 'priority'],
    searchFields: 'notes',
  };

  const deleteModalLabels = ['requestDate'];

  const tableActions = {
    showEdit: true,
    showDelete: true,
    position: 'right',
  };

  const dataTableColumns = [
    {
      title: 'Project',
      key: 'project',
      render: (_, record) => {
        const project = record.projectId;
        if (!project) return '-';
        if (typeof project === 'object' && project.name) {
          return project.projectCode ? `${project.name} (${project.projectCode})` : project.name;
        }
        return '-';
      },
    },
    {
      title: 'Request Date',
      dataIndex: 'requestDate',
      key: 'requestDate',
      render: (date) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      title: 'Required Date',
      dataIndex: 'requiredDate',
      key: 'requiredDate',
      render: (date) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => {
        const colors = {
          Low: 'default',
          Medium: 'processing',
          High: 'warning',
          Urgent: 'error',
        };
        return <Tag color={colors[priority]}>{priority}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          Pending: 'default',
          Approved: 'success',
          Rejected: 'error',
          Fulfilled: 'processing',
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
    {
      title: 'Items Count',
      key: 'itemsCount',
      render: (_, record) => record.items?.length || 0,
    },
  ];

  const config = {
    entity: 'inventory/requirement',
    PANEL_TITLE: 'Indent Request (Site Indent)',
    DATATABLE_TITLE: 'Indent Request List',
    ADD_NEW_ENTITY: 'Create New Indent Request',
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
