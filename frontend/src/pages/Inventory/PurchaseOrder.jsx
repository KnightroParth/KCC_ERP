import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Button, Table, Tag, message, Select, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';

function PurchaseOrderForm({ isUpdateForm = false }) {
  const form = Form.useFormInstance();
  const [items, setItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingRequirements, setPendingRequirements] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await request.list({ entity: 'inventory/requirement', options: { status: 'Pending' } });
        if (res?.result) {
          setPendingRequirements(res.result);
        }
      } catch (error) {
        console.error('Error loading requirements:', error);
      }
    })();
  }, []);

  useEffect(() => {
    if (isUpdateForm) {
      const currentItems = form.getFieldValue('items') || [];
      setItems(currentItems);
      updateTotalAmount(currentItems);
    }
  }, [isUpdateForm, form]);

  const convertFromRequirement = async (requirementId) => {
    if (!requirementId) return;
    try {
      const res = await request.read({ entity: 'inventory/requirement', id: requirementId });
      if (res?.result) {
        const requirement = res.result;
        
        const poItems = requirement.items.map((item, idx) => {
          // --- FIX IS HERE ---
          // Do NOT wrap the ID in a fake object. Pass it as is.
          let materialVal = item.material;
          
          // Only use a fallback if it is strictly null/undefined
          if (!materialVal) {
             materialVal = { _id: 'unknown', name: 'Unknown Material' };
          }
          // If it is a string (ID), we leave it as a string. 
          // AutoCompleteAsync will see the string and fetch the details automatically.

          return {
            key: Date.now() + idx, 
            material: materialVal, 
            quantity: item.quantity,
            rate: 0, 
            amount: 0,
          };
        });

        setItems(poItems);
        form.setFieldsValue({
          items: poItems, 
          referenceRequirement: requirementId,
          supplier: null, 
        });

        updateTotalAmount(poItems);
        message.success('Items loaded from requirement');
      }
    } catch (error) {
      message.error('Failed to load requirement: ' + error.message);
    }
  };

  const addItem = () => {
    const newItem = {
      key: Date.now(),
      material: null,
      quantity: 1,
      rate: 0,
      amount: 0,
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    form.setFieldsValue({ items: newItems });
  };

  const removeItem = (key) => {
    const newItems = items.filter((item) => item.key !== key);
    setItems(newItems);
    form.setFieldsValue({ items: newItems });
    updateTotalAmount(newItems);
  };

  const updateItem = (key, field, value) => {
    const newItems = items.map((item) => {
      if (item.key === key) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.amount = (updated.quantity || 0) * (updated.rate || 0);
        }
        return updated;
      }
      return item;
    });
    setItems(newItems);
    updateTotalAmount(newItems);
  };

  const updateTotalAmount = (currentItems) => {
    const total = currentItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    setTotalAmount(total);
    form.setFieldsValue({ totalAmount: total });
  };

  const columns = [
    {
      title: 'Material',
      key: 'material',
      width: '35%',
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'material']}
          rules={[{ required: true, message: 'Select material' }]}
          style={{ margin: 0 }}
        >
          <AutoCompleteAsync
            // Force re-render if key changes to prevent stale data
            key={record.material?._id || record.key} 
            entity="material"
            displayLabels={['name', 'category']}
            searchFields="name,category"
            outputValue="_id"
            placeholder="Search material..."
            onChange={(val, fullOption) => updateItem(record.key, 'material', fullOption || val)}
            value={items[index]?.material}
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
      title: 'Rate',
      key: 'rate',
      width: '15%',
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'rate']}
          rules={[{ required: true, message: 'Enter rate' }]}
          style={{ margin: 0 }}
        >
          <InputNumber
            min={0}
            step={0.01}
            style={{ width: '100%' }}
            onChange={(value) => updateItem(record.key, 'rate', value)}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      width: '15%',
      render: (_, record) => (
        <span style={{ fontWeight: 'bold' }}>
          ₹{((record.quantity || 0) * (record.rate || 0)).toLocaleString('en-IN')}
        </span>
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
      {!isUpdateForm && pendingRequirements.length > 0 && (
        <Form.Item label="Convert from Requirement">
          <Select
            placeholder="Select a pending requirement to convert"
            onChange={convertFromRequirement}
            allowClear
            style={{ width: '100%' }}
          >
            {pendingRequirements.map((req) => (
              <Select.Option key={req._id} value={req._id}>
                {req.projectId?.name || 'Unknown Project'} - {req.requestDate ? new Date(req.requestDate).toLocaleDateString() : 'No Date'} ({req.items?.length || 0} items)
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}

      <Form.Item
        label="Supplier"
        name="supplier"
        rules={[{ required: true, message: 'Please select a supplier' }]}
      >
        <SelectAsync
          entity="inventory/supplier"
          displayLabels={['name', 'phone']}
          outputValue="_id"
          placeholder="Select Supplier"
          withRedirect={true}
          redirectLabel="Add New Supplier"
          urlToRedirect="/supplier"
        />
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
        <Table
          dataSource={items}
          columns={columns}
          pagination={false}
          size="small"
          rowKey="key"
        />
      </Form.Item>

      {totalAmount > 0 && (
        <div style={{ marginBottom: 16, padding: 10, background: '#f0f5ff', borderRadius: 4 }}>
          <strong>Total Amount: </strong>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
            ₹{totalAmount.toLocaleString('en-IN')}
          </span>
        </div>
      )}

      <Form.Item label="Terms & Conditions" name="terms">
        <Input.TextArea rows={3} placeholder="Payment terms, delivery terms, etc." />
      </Form.Item>

      <Form.Item label="Notes" name="notes">
        <Input.TextArea rows={2} placeholder="Additional notes..." />
      </Form.Item>
    </>
  );
}

export default function PurchaseOrder() {
  const config = {
    entity: 'inventory/purchase-order',
    PANEL_TITLE: 'Purchase Order',
    DATATABLE_TITLE: 'Purchase Order List',
    ADD_NEW_ENTITY: 'Create New Purchase Order',
    ENTITY_NAME: 'Purchase Order',
    fields: {},
    searchConfig: { displayLabels: ['number', 'date'], searchFields: 'notes' },
    deleteModalLabels: ['number'],
    tableActions: { showEdit: true, showDelete: true },
    dataTableColumns: [
        { title: 'PO Number', key: 'number', render: (_, record) => `PO-${record.year}-${String(record.number).padStart(4, '0')}` },
        { title: 'Supplier', key: 'supplier', render: (_, r) => {
            // Support both object and simple string display
            if (typeof r.supplier === 'object') return r.supplier?.name || '-';
            return r.supplier || '-';
        }},
        { title: 'Date', dataIndex: 'date', render: (date) => (date ? new Date(date).toLocaleDateString() : '-') },
        { title: 'Status', dataIndex: 'status', render: (status) => <Tag>{status}</Tag> },
        { title: 'Total', dataIndex: 'totalAmount', render: (val) => `₹${(val || 0).toLocaleString('en-IN')}` },
    ]
  };

  return (
    <CrudModule
      config={config}
      createForm={<PurchaseOrderForm />}
      updateForm={<PurchaseOrderForm isUpdateForm={true} />}
    />
  );
}