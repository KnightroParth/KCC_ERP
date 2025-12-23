import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Button, Table, Tag, message, Select, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { selectCurrentItem } from '@/redux/crud/selectors';
import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
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

  // --- 2. POPULATE FORM DATA ---
  useEffect(() => {
    if (isUpdateForm && currentItem) {
      const formData = { ...currentItem };

      // Flatten supplier to ID
      if (formData.supplier && typeof formData.supplier === 'object') {
        formData.supplier = formData.supplier._id;
      }

      // Fix Date
      if (formData.date) {
        formData.date = dayjs(formData.date);
      }

      // Fix Items
      if (Array.isArray(formData.items)) {
        formData.items = formData.items.map((item, index) => ({
          ...item,
          key: item._id || Date.now() + index,
          rate: parseFloat(item.rate) || 0,
          amount: parseFloat(item.amount) || 0,
          quantity: parseFloat(item.quantity) || 0,
          material: item.material
        }));
      }

      form.setFieldsValue(formData);
      setItems(formData.items || []);
      updateTotalAmount(formData.items || []);
    }
  }, [isUpdateForm, currentItem, form]);

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
        
        // Recalculate Amount if Rate or Quantity changes
        if (field === 'quantity' || field === 'rate') {
          const qty = parseFloat(updated.quantity) || 0;
          const rate = parseFloat(updated.rate) || 0;
          updated.amount = qty * rate;
        }
        return updated;
      }
      return item;
    });

    // 1. Update Local State (UI)
    setItems(newItems);
    
    // 2. CRITICAL FIX: Use setFieldsValue (plural) to correctly sync with Ant Design Form
    form.setFieldsValue({ items: newItems });

    // 3. Update Totals
    updateTotalAmount(newItems);
  };

  const updateTotalAmount = (currentItems) => {
    const total = currentItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    setTotalAmount(total);
    form.setFieldsValue({ totalAmount: total });
  };

  // --- 3. COLUMN DEFINITIONS (Fixed Widths & Spacing) ---
  const columns = [
    {
      title: 'Material',
      dataIndex: 'material',
      key: 'material',
      width: 350, // Wider for Material Name
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
            value={items[index]?.quantity}
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
            value={items[index]?.rate}
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
        <div style={{ padding: '4px 11px', background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: '2px', textAlign: 'right' }}>
          <strong>₹{(items[index]?.amount || 0).toLocaleString('en-IN')}</strong>
        </div>
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
          <Input type="date" />
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
          // FIX: Add scroll to prevent columns from being squished
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

      {totalAmount > 0 && (
        <div style={{ marginBottom: 16, padding: 10, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, textAlign: 'right' }}>
          <strong>Total Amount: </strong>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#389e0d' }}>
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
            if (r.supplier && typeof r.supplier === 'object') {
                return r.supplier.name;
            }
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