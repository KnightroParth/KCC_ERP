import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Button, Table, Tag, message, Select, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';

// --- Temporary Mock Suppliers for Testing ---
const MOCK_SUPPLIERS = [
  { value: 'Test Supplier 1', label: 'Test Supplier 1' },
  { value: 'Test Supplier 2', label: 'Test Supplier 2' },
  { value: 'Local Hardware Store', label: 'Local Hardware Store' },
  { value: 'Cement Factory Direct', label: 'Cement Factory Direct' },
  { value: 'Steel Authority', label: 'Steel Authority' },
];

function PurchaseOrderForm({ isUpdateForm = false }) {
  const form = Form.useFormInstance();
  const [items, setItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingRequirements, setPendingRequirements] = useState([]);

  useEffect(() => {
    // Load pending requirements
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
    // Sync form items to local state on edit to ensure table renders
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
          // --- ROBUST MATERIAL CHECK ---
          // 1. If it's a full object (populated), use it.
          // 2. If it's just a string (ID), create a placeholder object.
          // 3. If null, show 'Unknown'.
          let materialObj = { _id: 'unknown', name: 'Unknown/Deleted Material' };
          
          if (item.material && typeof item.material === 'object') {
            materialObj = item.material;
          } else if (item.material && typeof item.material === 'string') {
            // Fallback: Create an object with the ID so AutoComplete has something to show
            materialObj = { _id: item.material, name: `Item ID: ${item.material}` };
          }

          return {
            key: Date.now() + idx, 
            material: materialObj, 
            quantity: item.quantity,
            rate: 0, 
            amount: 0,
          };
        });

        setItems(poItems);
        form.setFieldsValue({
          items: poItems, 
          referenceRequirement: requirementId,
          vendor: null, 
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
            // Force re-render if key changes (helps with "empty" issues on load)
            key={record.material?._id || record.key} 
            entity="material"
            displayLabels={['name', 'category']}
            searchFields="name,category"
            outputValue="_id"
            placeholder="Search material..."
            // Pass FULL OBJECT to updateItem so state knows the Name for calculations/display
            onChange={(val, fullOption) => updateItem(record.key, 'material', fullOption || val)}
            // Ensure the component gets the full object currently in state
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

      {/* --- MOCK SUPPLIER SELECTION (Testing Mode) --- */}
      <Form.Item
        label="Supplier (Testing)"
        name="vendor"
        rules={[{ required: true, message: 'Please select a supplier' }]}
      >
        <Select 
          placeholder="Select Supplier (Test Mode)"
          options={MOCK_SUPPLIERS}
          allowClear
          showSearch
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
        { title: 'Supplier', key: 'vendor', render: (_, r) => {
            // Handle both object (future) and string (current test) formats
            if (typeof r.vendor === 'object') return r.vendor?.name || '-';
            return r.vendor || '-';
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