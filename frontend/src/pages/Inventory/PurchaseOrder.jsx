import React, { useState, useEffect, useCallback } from 'react';
import { Form, InputNumber, Button, Table, Tag, message, Select, Input, DatePicker, Card, Statistic, Row, Col, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, WarningOutlined, ExclamationCircleOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { selectCurrentItem } from '@/redux/crud/selectors';
import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { request } from '@/request';
import { API_BASE_URL } from '@/config/serverApiConfig';
import dayjs from 'dayjs';

function PurchaseOrderForm({ isUpdateForm = false }) {
  const form = Form.useFormInstance();
  const [items, setItems] = useState([]);
  const [subTotal, setSubTotal] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
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

  // --- Helper: Recalculate Totals with Tax ---
  const recalculateTotals = useCallback((currentItems, currentTaxRate = taxRate) => {
    const sub = currentItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const tax = (sub * (currentTaxRate || 0)) / 100;
    const total = sub + tax;
    
    setSubTotal(sub);
    setTaxTotal(tax);
    setTotalAmount(total);
    
    // Sync with Form
    form.setFieldValue('subTotal', sub);
    form.setFieldValue('taxTotal', tax);
    form.setFieldValue('totalAmount', total);
  }, [form, taxRate]);

  // --- Handle Tax Rate Change ---
  const handleTaxRateChange = useCallback((value) => {
    const rate = parseFloat(value) || 0;
    setTaxRate(rate);
    form.setFieldValue('taxRate', rate);
    recalculateTotals(items, rate);
  }, [items, form, recalculateTotals]);

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

      // Fix Expected Delivery Date
      if (formData.expectedDeliveryDate) {
        formData.expectedDeliveryDate = dayjs(formData.expectedDeliveryDate);
      }

      // Fix Tax Rate
      if (formData.taxRate !== undefined) {
        setTaxRate(parseFloat(formData.taxRate) || 0);
      }

      // Fix Items
      if (Array.isArray(formData.items)) {
        formData.items = formData.items.map((item, index) => ({
          ...item,
          key: item._id || Date.now() + index,
          rate: parseFloat(item.rate) || 0,
          amount: parseFloat(item.amount) || 0,
          quantity: parseFloat(item.quantity) || 0,
          originalIndentQty: parseFloat(item.originalIndentQty) || null,
          material: item.material
        }));
      }

      form.setFieldsValue(formData);
      setItems(formData.items || []);
      recalculateTotals(formData.items || [], formData.taxRate || 0);
    } else if (!isUpdateForm) {
      // Default date for new forms
      form.setFieldValue('date', dayjs());
      form.setFieldValue('taxRate', 0);
    }
  }, [isUpdateForm, currentItem, form, recalculateTotals]);

  // --- Auto-calculate Expected Delivery Date when PO Date or Lead Time changes ---
  const handleDateOrLeadTimeChange = useCallback(() => {
    const poDate = form.getFieldValue('date');
    const leadTime = form.getFieldValue('leadTimeDays');
    
    if (poDate && leadTime && leadTime > 0) {
      const expectedDate = dayjs(poDate).add(leadTime, 'day');
      form.setFieldValue('expectedDeliveryDate', expectedDate);
    } else {
      form.setFieldValue('expectedDeliveryDate', null);
    }
  }, [form]);

  const convertFromRequirement = async (requirementId) => {
    if (!requirementId) return;
    try {
      const res = await request.read({ entity: 'inventory/requirement', id: requirementId });
      if (res?.result) {
        const requirement = res.result;
        
        // Group items by material._id and sum quantities
        const groupedItems = {};
        
        requirement.items.forEach((item) => {
          let materialVal = item.material;
          if (!materialVal) {
            materialVal = { _id: 'unknown', name: 'Unknown Material' };
          }
          
          const materialId = materialVal._id || materialVal;
          const quantity = parseFloat(item.quantity) || 0;
          
          if (groupedItems[materialId]) {
            groupedItems[materialId].quantity += quantity;
            groupedItems[materialId].originalIndentQty += quantity;
          } else {
            groupedItems[materialId] = {
              key: Date.now() + Object.keys(groupedItems).length,
              material: materialVal,
              quantity: quantity,
              originalIndentQty: quantity,
              rate: 0,
              amount: 0,
            };
          }
        });

        const poItems = Object.values(groupedItems);

        setItems(poItems);
        form.setFieldsValue({
          items: poItems, 
          referenceRequirement: requirementId,
          supplier: null, 
        });

        recalculateTotals(poItems, taxRate);
        message.success(`Items loaded from requirement (${poItems.length} unique materials)`);
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
      originalIndentQty: null,
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    form.setFieldsValue({ items: newItems });
  };

  const removeItem = (key) => {
    const newItems = items.filter((item) => item.key !== key);
    setItems(newItems);
    form.setFieldsValue({ items: newItems });
    recalculateTotals(newItems, taxRate);
  };

  const updateItem = (key, field, value) => {
    const index = items.findIndex((item) => item.key === key);
    if (index === -1) return;

    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    // Recalculate Amount if Rate or Quantity changes
    if (field === 'quantity' || field === 'rate') {
      const qty = parseFloat(field === 'quantity' ? value : item.quantity) || 0;
      const rate = parseFloat(field === 'rate' ? value : item.rate) || 0;
      item.amount = qty * rate;
      
      form.setFieldValue(['items', index, 'amount'], item.amount);
    }
    
    form.setFieldValue(['items', index, field], value);

    newItems[index] = item;
    setItems(newItems);
    recalculateTotals(newItems, taxRate);
  };

  // --- Helper: Get Variance Status ---
  const getVarianceStatus = (currentQty, originalQty) => {
    if (!originalQty || originalQty === null) return null;
    
    if (currentQty > originalQty) {
      const diff = currentQty - originalQty;
      return { 
        type: 'over', 
        color: '#ff4d4f', 
        icon: <ExclamationCircleOutlined />, 
        text: 'Over ordering',
        diff: diff
      };
    } else if (currentQty < originalQty) {
      return { 
        type: 'partial', 
        color: '#fa8c16', 
        icon: <WarningOutlined />, 
        text: 'Partial order' 
      };
    } else {
      return { 
        type: 'exact', 
        color: '#52c41a', 
        icon: <CheckCircleOutlined />, 
        text: 'Exact match' 
      };
    }
  };

  // --- Calculate Summary Statistics ---
  const summaryStats = useCallback(() => {
    const uniqueItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    return { uniqueItems, totalQuantity };
  }, [items]);

  const stats = summaryStats();

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
      width: 180,
      render: (_, record, index) => {
        const currentQty = parseFloat(items[index]?.quantity) || 0;
        const originalQty = items[index]?.originalIndentQty;
        const variance = getVarianceStatus(currentQty, originalQty);
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Form.Item
              name={['items', index, 'quantity']}
              rules={[{ required: true, message: 'Required' }]}
              style={{ margin: 0, flex: 1 }}
            >
              <InputNumber
                min={0.01}
                style={{ width: '100%' }}
                placeholder="Qty"
                onChange={(value) => updateItem(record.key, 'quantity', value)}
              />
            </Form.Item>
            {variance && (
              <Tooltip 
                title={
                  variance.type === 'over' 
                    ? `Over-ordering by ${variance.diff} units: ${originalQty} (Indent) vs ${currentQty} (PO)`
                    : `${variance.text}: ${originalQty} (Indent) vs ${currentQty} (PO)`
                }
              >
                <Tag color={variance.color} icon={variance.icon} style={{ margin: 0 }}>
                  {variance.text}
                </Tag>
              </Tooltip>
            )}
            {originalQty && (
              <Form.Item name={['items', index, 'originalIndentQty']} style={{ display: 'none' }}>
                <Input />
              </Form.Item>
            )}
          </div>
        );
      },
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
            style={{ display: 'none' }}
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

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <Form.Item
          label="PO Date"
          name="date"
          rules={[{ required: true }]}
          style={{ flex: 1, minWidth: '200px' }}
        >
          <DatePicker 
            style={{ width: '100%' }} 
            format="DD/MM/YYYY"
            onChange={() => handleDateOrLeadTimeChange()}
          />
        </Form.Item>
        <Form.Item
          label="Lead Time (Days)"
          name="leadTimeDays"
          style={{ flex: 1, minWidth: '150px' }}
        >
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            placeholder="Enter days"
            onChange={() => handleDateOrLeadTimeChange()}
          />
        </Form.Item>
        <Form.Item
          label="Expected Delivery"
          name="expectedDeliveryDate"
          style={{ flex: 1, minWidth: '200px' }}
        >
          <DatePicker 
            style={{ width: '100%' }} 
            format="DD/MM/YYYY"
            disabled
            placeholder="Auto-calculated"
          />
        </Form.Item>
        <Form.Item
          label="Status"
          name="status"
          initialValue="Draft"
          style={{ flex: 1, minWidth: '150px' }}
        >
          <Select>
            <Select.Option value="Draft">Draft</Select.Option>
            <Select.Option value="Issued">Issued</Select.Option>
            <Select.Option value="Partially Received">Partially Received</Select.Option>
            <Select.Option value="Closed">Closed</Select.Option>
          </Select>
        </Form.Item>
      </div>

      {/* Summary Dashboard */}
      {items.length > 0 && (
        <Card 
          title="Purchase Order Summary" 
          style={{ marginBottom: 16 }}
          bodyStyle={{ padding: '16px' }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Statistic
                title="Total Unique Items"
                value={stats.uniqueItems}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Total Quantity"
                value={stats.totalQuantity}
                precision={2}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Sub Total"
                value={subTotal}
                prefix="₹"
                precision={2}
                valueStyle={{ color: '#1890ff', fontSize: '18px', fontWeight: 'bold' }}
              />
            </Col>
          </Row>
        </Card>
      )}

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

      {/* Tax and Totals Section */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: 16, flexWrap: 'wrap' }}>
        <Form.Item
          label="Tax %"
          name="taxRate"
          style={{ flex: 1, minWidth: '150px' }}
        >
          <InputNumber
            min={0}
            max={100}
            style={{ width: '100%' }}
            placeholder="Tax Rate"
            onChange={handleTaxRateChange}
            suffix="%"
          />
        </Form.Item>
        <div style={{ flex: 2, minWidth: '200px', paddingTop: '32px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Sub Total: </strong>
              <span style={{ fontSize: '16px' }}>₹{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {taxRate > 0 && (
              <div style={{ marginBottom: 8 }}>
                <strong>Tax ({taxRate}%): </strong>
                <span style={{ fontSize: '16px' }}>₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ padding: '10px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
              <strong>Grand Total: </strong>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#389e0d' }}>
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden fields for form submission */}
      <Form.Item name="subTotal" hidden>
        <InputNumber />
      </Form.Item>
      <Form.Item name="taxTotal" hidden>
        <InputNumber />
      </Form.Item>
      <Form.Item name="totalAmount" hidden>
        <InputNumber />
      </Form.Item>

      <Form.Item label="Terms & Conditions" name="termsAndConditions">
        <Input.TextArea rows={3} placeholder="Payment terms, delivery terms, etc." />
      </Form.Item>

      <Form.Item label="Notes" name="notes">
        <Input.TextArea rows={2} placeholder="Additional notes..." />
      </Form.Item>
    </>
  );
}

export default function PurchaseOrder() {
  const { result: currentRequest } = useSelector(selectCurrentItem);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!currentRequest?._id) {
      message.error('No Purchase Order selected');
      return;
    }

    setPdfLoading(true);
    try {
      const pdfUrl = `${API_BASE_URL}inventory/purchase-order/pdf/${currentRequest._id}`;
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.target = '_blank';
      link.download = `PO-${currentRequest.year}-${String(currentRequest.number).padStart(4, '0')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Give it a moment for the download to start
      setTimeout(() => {
        setPdfLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      message.error('Failed to download PDF');
      setPdfLoading(false);
    }
  };

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
    ],
    extra: currentRequest?._id ? [
      <Button
        key="pdf"
        type="primary"
        icon={<FilePdfOutlined />}
        onClick={handleDownloadPDF}
        loading={pdfLoading}
      >
        Download PDF
      </Button>
    ] : []
  };

  return (
    <CrudModule
      config={config}
      createForm={<PurchaseOrderForm />}
      updateForm={<PurchaseOrderForm isUpdateForm={true} />}
    />
  );
}
