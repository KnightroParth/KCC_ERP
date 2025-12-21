// frontend/src/pages/Inventory/PurchaseOrder.jsx

import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Button, Table, Tag, message, Select, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';

function PurchaseOrderForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const [items, setItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingRequirements, setPendingRequirements] = useState([]);

  useEffect(() => {
    // Load pending requirements for conversion
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
    // On Edit: Sync items from form to local state to ensure table renders
    if (isUpdateForm) {
      const currentItems = form.getFieldValue('items') || [];
      setItems(currentItems);
      updateTotalAmount(currentItems);
    }
  }, [isUpdateForm, form]);

  const convertFromRequirement = async (requirementId) => {
    try {
      const res = await request.read({ entity: 'inventory/requirement', id: requirementId });
      if (res?.result) {
        const requirement = res.result;
        
        // Map requirement items to PO items structure
        const poItems = requirement.items.map((item, idx) => ({
          key: Date.now() + idx, 
          // FIX: Pass the full material OBJECT. This ensures AutoComplete can display the name.
          material: item.material, 
          quantity: item.quantity,
          rate: 0, 
          amount: 0,
        }));

        // 1. Update Local State (Renders the rows)
        setItems(poItems);

        // 2. Update Form State (Populates the inputs inside the rows)
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
    // Important: Sync with form to ensure array integrity
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
    // Note: Form fields update automatically via onChange, but we sync state for calculations
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
          >
            {pendingRequirements.map((req) => (
              <Select.Option key={req._id} value={req._id}>
                {req.projectId?.name || 'Unknown Project'} - {req.requestDate ? new Date(req.requestDate).toLocaleDateString() : 'No Date'} ({req.items?.length || 0} items)
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}

      {/* Renamed Label to Supplier as requested */}
      <Form.Item
        label="Supplier"
        name="vendor"
        rules={[{ required: true, message: 'Please select a supplier' }]}
      >
        <SelectAsync
          entity="vendor"
          displayLabels={['name', 'phone']}
          outputValue="_id"
          placeholder="Select Supplier"
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
        {/* Pass items to Table dataSource */}
        <Table
          dataSource={items}
          columns={columns}
          pagination={false}
          size="small"
        />
      </Form.Item>

      {totalAmount > 0 && (
        <div style={{ marginBottom: 16 }}>
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
  const entity = 'inventory/purchase-order';

  const searchConfig = {
    displayLabels: ['number', 'date'],
    searchFields: 'notes',
  };

  const deleteModalLabels = ['number'];

  const tableActions = {
    showEdit: true,
    showDelete: true,
    position: 'right',
  };

  const dataTableColumns = [
    {
      title: 'PO Number',
      key: 'number',
      render: (_, record) => `PO-${record.year}-${String(record.number).padStart(4, '0')}`,
    },
    {
      title: 'Supplier', // Renamed from Vendor
      key: 'vendor',
      render: (_, record) => {
        const vendor = record.vendor;
        if (!vendor) return '-';
        if (typeof vendor === 'object' && vendor.name) {
          return vendor.name;
        }
        return '-';
      },
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          Draft: 'default',
          Issued: 'processing',
          'Partially Received': 'warning',
          Closed: 'success',
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`,
    },
    {
      title: 'Items',
      key: 'itemsCount',
      render: (_, record) => record.items?.length || 0,
    },
  ];

  const config = {
    entity: 'inventory/purchase-order',
    PANEL_TITLE: 'Purchase Order',
    DATATABLE_TITLE: 'Purchase Order List',
    ADD_NEW_ENTITY: 'Create New Purchase Order',
    ENTITY_NAME: 'Purchase Order',
    fields: {},
    searchConfig,
    deleteModalLabels,
    tableActions,
    dataTableColumns,
  };

  return (
    <CrudModule
      config={config}
      createForm={<PurchaseOrderForm />}
      updateForm={<PurchaseOrderForm isUpdateForm={true} />}
    />
  );
}