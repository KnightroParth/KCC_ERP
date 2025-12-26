import React, { useState, useEffect, useCallback } from 'react';
import { Form, InputNumber, Button, Table, Tag, message, Select, Input, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { selectCurrentItem } from '@/redux/crud/selectors';
import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { request } from '@/request';
import dayjs from 'dayjs';

function PurchaseOrderForm({ isUpdateForm = false }) {
  const form = Form.useFormInstance();
  const [items, setItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingRequirements, setPendingRequirements] = useState([]);

  // --- 1. Get Current Item Data from Redux (For Edit Mode) ---
  const { result: currentItem } = useSelector(selectCurrentItem);

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

  // --- Helper: Recalculate Total ---
  const recalculateTotal = useCallback((currentItems) => {
    const total = currentItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    setTotalAmount(total);
    // Sync total with Form
    form.setFieldValue('totalAmount', total);
  }, [form]);

  // --- 2. POPULATE FORM DATA ---
  useEffect(() => {
    if (isUpdateForm && currentItem) {
      const formData = { ...currentItem };

      // Flatten supplier to ID
      if (formData.supplier && typeof formData.supplier === 'object') {
        formData.supplier = formData.supplier._id;
      }

      // Fix Date: Convert to dayjs object
      if (formData.date) {
        formData.date = dayjs(formData.date);
      } else {
        formData.date = dayjs();
      }

      // Fix Items
      if (Array.isArray(formData.items)) {
        formData.items = formData.items.map((item, index) => ({
          ...item,
          key: item._id || Date.now() + index,
          rate: parseFloat(item.rate) || 0,
          amount: parseFloat(item.amount) || 0,
          quantity: parseFloat(item.quantity) || 0,
          material: item.material // Keep full object for display if needed
        }));
      }

      form.setFieldsValue(formData);
      setItems(formData.items || []);
      recalculateTotal(formData.items || []);
    } else if (!isUpdateForm) {
      // Default date for new forms
      form.setFieldValue('date', dayjs());
    }
  }, [isUpdateForm, currentItem, form, recalculateTotal]);

  const convertFromRequirement = async (requirementId) => {
    if (!requirementId) return;
    try {
      const res = await request.read({ entity: 'inventory/requirement', id: requirementId });
      if (res?.result) {
        const requirement = res.result;
        
        const poItems = requirement.items.map((item, idx) => {
          let materialVal = item.material;
          if (!materialVal) {
             materialVal = { _id: 'unknown', name: 'Unknown Material' };
          }

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

        recalculateTotal(poItems);
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
    recalculateTotal(newItems);
  };

  const updateItem = (key, field, value) => {
    // Find index for direct form update
    const index = items.findIndex((item) => item.key === key);
    if (index === -1) return;

    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    // Recalculate Amount if Rate or Quantity changes
    if (field === 'quantity' || field === 'rate') {
      const qty = parseFloat(field === 'quantity' ? value : item.quantity) || 0;
      const rate = parseFloat(field === 'rate' ? value : item.rate) || 0;
      item.amount = qty * rate;
      
      // Explicitly update the amount field in the form for this row
      form.setFieldValue(['items', index, 'amount'], item.amount);
    }
    
    // Explicitly update the changed field in the form
    form.setFieldValue(['items', index, field], value);

    newItems[index] = item;
    setItems(newItems);
    recalculateTotal(newItems);
  };

  // --- 3. COLUMN DEFINITIONS ---
  const columns = [
    {
      title: 'Material',
      dataIndex: 'material',
      key: 'material',
      width: 350, 
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'material']}
          rules={[{ required: true, message: 'Select material' }]}
          style={{ margin: 0 }}
        >
          <AutoCompleteAsync
            key={record.key} 
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
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'quantity']}
          rules={[{ required: true, message: 'Required' }]}
          style={{ margin: 0 }}
        >
          <InputNumber
            min={0.01}
            style={{ width: '100%' }}
            placeholder="Qty"
            onChange={(value) => updateItem(record.key, 'quantity', value)}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      width: 150,
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'rate']}
          rules={[{ required: true, message: 'Required' }]}
          style={{ margin: 0 }}
        >
          <InputNumber
            min={0}
            step={0.01}
            style={{ width: '100%' }}
            prefix="₹"
            placeholder="Rate"
            onChange={(value) => updateItem(record.key, 'rate', value)}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (_, record, index) => (
        <>
          <Form.Item
            name={['items', index, 'amount']}
            style={{ display: 'none' }} // Hidden input to keep form sync
          >
             <Input />
          </Form.Item>
          <div style={{ padding: '4px 11px', background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: '2px', textAlign: 'right' }}>
            <strong>₹{(items[index]?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>
        </>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 50,
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
                {req.projectId?.name || 'Unknown Project'} - {req.requestDate ? dayjs(req.requestDate).format('DD/MM/YYYY') : 'No Date'} ({req.items?.length || 0} items)
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
          urlToRedirect="/supplier"
          redirectLabel="Add New Supplier"
        />
      </Form.Item>

      <div style={{ display: 'flex', gap: '20px' }}>
        <Form.Item
          label="PO Date"
          name="date"
          rules={[{ required: true }]}
          style={{ flex: 1 }}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item
          label="Status"
          name="status"
          initialValue="Draft"
          style={{ flex: 1 }}
        >
          <Select>
            <Select.Option value="Draft">Draft</Select.Option>
            <Select.Option value="Issued">Issued</Select.Option>
            <Select.Option value="Partially Received">Partially Received</Select.Option>
            <Select.Option value="Closed">Closed</Select.Option>
          </Select>
        </Form.Item>
      </div>

      <Form.Item label="Items" required>
        <Table
          dataSource={items}
          columns={columns}
          pagination={false}
          size="small"
          rowKey="key"
          scroll={{ x: 'max-content' }} 
          footer={() => (
            <Button
              type="dashed"
              onClick={addItem}
              icon={<PlusOutlined />}
              block
            >
              Add Material
            </Button>
          )}
        />
      </Form.Item>

      {/* Hidden total field for form submission */}
      <Form.Item name="totalAmount" hidden>
        <InputNumber />
      </Form.Item>

      {totalAmount > 0 && (
        <div style={{ marginBottom: 16, padding: 10, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, textAlign: 'right' }}>
          <strong>Total Amount: </strong>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#389e0d' }}>
            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
            if (r.supplier && typeof r.supplier === 'object') {
                return r.supplier.name;
            }
            return r.supplier || '-';
        }},
        { title: 'Date', dataIndex: 'date', render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-') },
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