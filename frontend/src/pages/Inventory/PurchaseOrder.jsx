import React, { useState, useEffect, useCallback } from 'react';
import { Form, InputNumber, Button, Table, Tag, message, Select, Input, DatePicker, Card, Statistic, Row, Col, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, WarningOutlined, ExclamationCircleOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { selectCurrentItem } from '@/redux/crud/selectors';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';
import LockedProjectInput from '@/components/LockedProjectInput';
import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { request } from '@/request';
import { API_BASE_URL } from '@/config/serverApiConfig';
import dayjs from 'dayjs';
import { useGranularPermission } from '@/hooks/usePermission';

function PurchaseOrderForm({ isUpdateForm = false }) {
  const form = Form.useFormInstance();
  const currentProject = useSelector(selectCurrentProject);
  const shouldLockProject = useSelector(selectShouldLockProject);
  const [items, setItems] = useState([]);
  const [subTotal, setSubTotal] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingRequirements, setPendingRequirements] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { result: currentItem } = useSelector(selectCurrentItem);
  const safeCurrentItem = currentItem || {};
  const hasSavedPO = safeCurrentItem?._id ? true : false;
  const canGeneratePoPdf = useGranularPermission('inventory', 'purchaseOrder.generatePdf');

  useEffect(() => {
    if (!isUpdateForm && shouldLockProject && currentProject) {
      form.setFieldsValue({ projectId: currentProject._id });
    }
  }, [isUpdateForm, shouldLockProject, currentProject, form]);

  useEffect(() => {
    (async () => {
      try {
        const res = await request.list({ entity: 'inventory/requirement', options: { status: 'Pending' } });
        if (res?.result) {
          setPendingRequirements(res.result || []);
        }
      } catch (error) {
        console.error('Error loading requirements:', error);
        setPendingRequirements([]);
      }
    })();
  }, []);

  const recalculateTotals = useCallback((currentItems, currentTaxRate = taxRate) => {
    try {
      const sub = (currentItems || []).reduce((sum, item) => sum + (parseFloat(item?.amount) || 0), 0);
      const tax = (sub * (parseFloat(currentTaxRate) || 0)) / 100;
      const total = sub + tax;
      
      setSubTotal(sub);
      setTaxTotal(tax);
      setTotalAmount(total);
      
      form.setFieldValue('subTotal', sub);
      form.setFieldValue('taxTotal', tax);
      form.setFieldValue('totalAmount', total);
    } catch (err) {
      console.error('Error in recalculateTotals:', err);
    }
  }, [form, taxRate]);

  const handleTaxRateChange = useCallback((value) => {
    try {
      const rate = parseFloat(value) || 0;
      setTaxRate(rate);
      form.setFieldValue('taxRate', rate);
      recalculateTotals(items, rate);
    } catch (err) {
      console.error('Error in handleTaxRateChange:', err);
    }
  }, [items, form, recalculateTotals]);

  useEffect(() => {
    try {
      if (isUpdateForm && safeCurrentItem?._id) {
        const formData = { ...safeCurrentItem };

        if (formData.supplier && typeof formData.supplier === 'object') {
          formData.supplier = formData.supplier._id || formData.supplier;
        }
        if (formData.projectId && typeof formData.projectId === 'object') {
          formData.projectId = formData.projectId._id || formData.projectId;
        }

        if (formData.date) formData.date = dayjs(formData.date);
        else formData.date = dayjs();

        if (formData.expiredDate) formData.expiredDate = dayjs(formData.expiredDate);

        if (formData.taxRate !== undefined) {
          setTaxRate(parseFloat(formData.taxRate) || 0);
        }

        if (Array.isArray(formData.items)) {
          formData.items = formData.items.map((item, index) => ({
            ...item,
            key: item._id || item.key || `item-${Date.now()}-${index}`,
            rate: parseFloat(item.rate) || 0,
            amount: parseFloat(item.amount) || 0,
            quantity: parseFloat(item.quantity) || 0,
            originalIndentQty: parseFloat(item.originalIndentQty) || null,
            material: item.material || null
          }));
        } else {
          formData.items = [];
        }

        form.setFieldsValue(formData);
        setItems(formData.items || []);
        recalculateTotals(formData.items || [], formData.taxRate || 0);
      } else if (!isUpdateForm) {
        form.setFieldValue('date', dayjs());
        form.setFieldValue('taxRate', 0);
        form.setFieldValue('leadTimeDays', 0);
        if (shouldLockProject && currentProject) {
          form.setFieldValue('projectId', currentProject._id);
        }
      }
    } catch (err) {
      console.error('Error in form population useEffect:', err);
    }
  }, [isUpdateForm, safeCurrentItem, form, recalculateTotals, shouldLockProject, currentProject]);

  const handleDateOrLeadTimeChange = useCallback(() => {
    try {
      const poDate = form.getFieldValue('date');
      const leadTime = form.getFieldValue('leadTimeDays');
      
      if (poDate && leadTime && leadTime > 0) {
        const expectedDate = dayjs(poDate).add(leadTime, 'day');
        form.setFieldValue('expiredDate', expectedDate);
      } else {
        form.setFieldValue('expiredDate', null);
      }
    } catch (err) {
      console.error('Error in handleDateOrLeadTimeChange:', err);
    }
  }, [form]);

  // ✅ FIX: Attach token to URL so the backend accepts the request
  const handleDownloadPDF = async () => {
    if (!hasSavedPO || !safeCurrentItem?._id) {
      message.error('No Purchase Order selected');
      return;
    }

    setPdfLoading(true);
    try {
      const token = window.localStorage.getItem('token');
      const pdfUrl = `${API_BASE_URL}inventory/purchase-order/pdf/${safeCurrentItem._id}?token=${token}`;
      window.open(pdfUrl, '_blank');
      setTimeout(() => {
        setPdfLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      message.error('Failed to download PDF');
      setPdfLoading(false);
    }
  };

  const convertFromRequirement = async (requirementId) => {
    if (!requirementId) return;
    try {
      const res = await request.read({ entity: 'inventory/requirement', id: requirementId });
      if (res?.result) {
        const requirement = res.result || {};
        
        const groupedItems = {};
        
        (requirement.items || []).forEach((item) => {
          let materialVal = item?.material;
          if (!materialVal) materialVal = { _id: 'unknown', name: 'Unknown Material' };
          
          const materialId = materialVal._id || materialVal;
          const quantity = parseFloat(item?.quantity) || 0;
          
          if (groupedItems[materialId]) {
            groupedItems[materialId].quantity += quantity;
            groupedItems[materialId].originalIndentQty += quantity;
          } else {
            groupedItems[materialId] = {
              key: `item-${Date.now()}-${Object.keys(groupedItems).length}`,
              material: materialVal,
              quantity: quantity,
              originalIndentQty: quantity,
              rate: 0,
              amount: 0,
            };
          }
        });

        const poItems = Object.values(groupedItems);
        const reqProjectId = requirement?.projectId?._id || requirement?.projectId;

        setItems(poItems);
        form.setFieldsValue({
          items: poItems,
          referenceRequirement: requirementId,
          supplier: null,
          projectId: reqProjectId || (shouldLockProject && currentProject ? currentProject._id : null),
        });

        recalculateTotals(poItems, taxRate);
        message.success(`Items loaded from requirement (${poItems.length} unique materials)`);
      }
    } catch (error) {
      console.error('Error in convertFromRequirement:', error);
      message.error('Failed to load requirement');
    }
  };

  const addItem = () => {
    try {
      const newItem = {
        key: `item-${Date.now()}`,
        material: null,
        quantity: 1,
        rate: 0,
        amount: 0,
        originalIndentQty: null,
      };
      const newItems = [...items, newItem];
      setItems(newItems);
      form.setFieldValue({ items: newItems });
    } catch (err) {
      console.error('Error in addItem:', err);
    }
  };

  const removeItem = (key) => {
    try {
      const newItems = items.filter((item) => item?.key !== key);
      setItems(newItems);
      form.setFieldValue({ items: newItems });
      recalculateTotals(newItems, taxRate);
    } catch (err) {
      console.error('Error in removeItem:', err);
    }
  };

  const updateItem = (key, field, value, options) => {
    try {
      const index = items.findIndex((item) => item?.key === key);
      if (index === -1) return;

      const newItems = [...items];
      const item = { ...newItems[index], [field]: value };

      // When material is selected, auto-fill rate from material library (price)
      if (field === 'material' && options?.rateFromMaterial != null) {
        const rate = parseFloat(options.rateFromMaterial) || 0;
        item.rate = rate;
        form.setFieldValue(['items', index, 'rate'], rate);
        const qty = parseFloat(item.quantity) || 0;
        item.amount = qty * rate;
        form.setFieldValue(['items', index, 'amount'], item.amount);
      }

      if (field === 'quantity' || field === 'rate') {
        const qty = parseFloat(field === 'quantity' ? value : item.quantity) || 0;
        const rate = parseFloat(field === 'rate' ? value : item.rate) || 0;
        const calculatedAmount = qty * rate;
        item.amount = calculatedAmount;
        form.setFieldValue(['items', index, 'amount'], calculatedAmount);
      }
      
      form.setFieldValue(['items', index, field], value);
      newItems[index] = item;
      setItems(newItems);
      recalculateTotals(newItems, taxRate);
    } catch (err) {
      console.error('Error in updateItem:', err);
    }
  };

  const getVarianceStatus = (currentQty, originalQty) => {
    if (!originalQty || originalQty === null) return null;
    try {
      if (currentQty > originalQty) {
        return { type: 'over', color: '#ff4d4f', icon: <ExclamationCircleOutlined />, text: 'Over ordering', diff: currentQty - originalQty };
      } else if (currentQty < originalQty) {
        return { type: 'partial', color: '#fa8c16', icon: <WarningOutlined />, text: 'Partial order' };
      } else {
        return { type: 'exact', color: '#52c41a', icon: <CheckCircleOutlined />, text: 'Exact match' };
      }
    } catch (err) {
      return null;
    }
  };

  const summaryStats = useCallback(() => {
    try {
      const uniqueItems = items.length;
      const totalQuantity = (items || []).reduce((sum, item) => sum + (parseFloat(item?.quantity) || 0), 0);
      return { uniqueItems, totalQuantity };
    } catch (err) {
      return { uniqueItems: 0, totalQuantity: 0 };
    }
  }, [items]);

  const stats = summaryStats();

  const columns = [
    {
      title: 'Material',
      dataIndex: 'material',
      key: 'material',
      width: 350, 
      render: (_, record, index) => (
        <Form.Item name={['items', index, 'material']} rules={[{ required: true, message: 'Select material' }]} style={{ margin: 0 }}>
          <AutoCompleteAsync
            key={record?.key} 
            entity="material"
            displayLabels={['name', 'category']}
            searchFields="name,category"
            outputValue="_id"
            placeholder="Search material..."
            onChange={(val, fullOption) => updateItem(record?.key, 'material', fullOption || val, { rateFromMaterial: fullOption?.price })}
            value={items[index]?.material}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 220,
      render: (_, record, index) => {
        const currentQty = parseFloat(items[index]?.quantity) || 0;
        const originalQty = items[index]?.originalIndentQty;
        const variance = getVarianceStatus(currentQty, originalQty);
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Form.Item 
              name={['items', index, 'quantity']} 
              rules={[{ required: true, message: 'Required' }]} 
              style={{ margin: 0, minWidth: '200px', flex: 1 }}
              getValueProps={(value) => ({ value: value !== undefined && value !== null ? parseFloat(value) : undefined })}
              normalize={(value) => value !== undefined && value !== null ? parseFloat(value) : undefined}
            >
              <InputNumber 
                min={0.01} 
                step={0.01}
                style={{ width: '100%', minWidth: '180px', fontSize: '14px' }} 
                placeholder="Qty" 
                precision={2}
                onChange={(value) => updateItem(record?.key, 'quantity', value)} 
              />
            </Form.Item>
            {variance && (
              <Tooltip title={variance.type === 'over' ? `Over-ordering by ${variance.diff}` : `${variance.text}`}>
                <Tag color={variance.color} icon={variance.icon} style={{ margin: 0 }}>{variance.text}</Tag>
              </Tooltip>
            )}
            {originalQty && (
              <Form.Item name={['items', index, 'originalIndentQty']} style={{ display: 'none' }}><Input /></Form.Item>
            )}
          </div>
        );
      },
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      width: 200,
      render: (_, record, index) => (
        <Form.Item name={['items', index, 'rate']} rules={[{ required: true, message: 'Required' }]} style={{ margin: 0 }}>
          <InputNumber 
            min={0} 
            step={0.01} 
            style={{ width: '100%', minWidth: '150px', fontSize: '14px' }} 
            prefix="₹" 
            placeholder="Rate" 
            onChange={(value) => updateItem(record?.key, 'rate', value)} 
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
          <Form.Item name={['items', index, 'amount']} style={{ display: 'none' }}><Input /></Form.Item>
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
      render: (_, record) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(record?.key)} />,
    },
  ];

  return (
    <>
      {hasSavedPO && canGeneratePoPdf && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={handleDownloadPDF} loading={pdfLoading} size="large">Download PDF</Button>
        </div>
      )}

      <Form.Item
        label="Project"
        name="projectId"
        rules={[{ required: true, message: 'Please select a project' }]}
        initialValue={shouldLockProject && currentProject ? currentProject._id : undefined}
      >
        {shouldLockProject && currentProject ? (
          <LockedProjectInput />
        ) : (
          <SelectAsync
            entity="project"
            displayLabels={['name', 'projectCode']}
            outputValue="_id"
            placeholder="Select Project"
          />
        )}
      </Form.Item>

      {!isUpdateForm && pendingRequirements.length > 0 && (
        <Form.Item label="Convert from Requirement">
          <Select placeholder="Select a pending requirement to convert" onChange={convertFromRequirement} allowClear style={{ width: '100%' }}>
            {pendingRequirements.map((req) => (
              <Select.Option key={req?._id} value={req?._id}>
                {req?.projectId?.name || 'Unknown Project'} - {req?.requestDate ? dayjs(req.requestDate).format('DD/MM/YYYY') : 'No Date'} ({req?.items?.length || 0} items)
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}

      <Form.Item label="Supplier" name="supplier" rules={[{ required: true, message: 'Please select a supplier' }]}>
        <SelectAsync
          entity="inventory/supplier"
          displayLabels={['name', 'phone']}
          searchFields="name,email,phone,contactPerson,gstNumber,address"
          outputValue="_id"
          placeholder="Type to search supplier..."
          withRedirect={true}
          urlToRedirect="/inventory/supplier"
          redirectLabel="Add New Supplier"
        />
      </Form.Item>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <Form.Item label="PO Date" name="date" rules={[{ required: true }]} style={{ flex: 1, minWidth: '200px' }}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" onChange={() => handleDateOrLeadTimeChange()} />
        </Form.Item>
        <Form.Item label="Lead Time (Days)" name="leadTimeDays" style={{ flex: 1, minWidth: '150px' }}>
          <InputNumber min={0} style={{ width: '100%' }} placeholder="Enter days" onChange={() => handleDateOrLeadTimeChange()} />
        </Form.Item>
        <Form.Item label="Expected Delivery" name="expiredDate" style={{ flex: 1, minWidth: '200px' }}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabled placeholder="Auto-calculated" />
        </Form.Item>
        <Form.Item label="Status" name="status" initialValue="Draft" style={{ flex: 1, minWidth: '150px' }}>
          <Select>
            <Select.Option value="Draft">Draft</Select.Option>
            <Select.Option value="Pending">Pending</Select.Option>
            <Select.Option value="Issued">Issued</Select.Option>
            <Select.Option value="Received">Received</Select.Option>
            <Select.Option value="Closed">Closed</Select.Option>
          </Select>
        </Form.Item>
      </div>

      {items.length > 0 && (
        <Card title="Purchase Order Summary" style={{ marginBottom: 16 }} bodyStyle={{ padding: '16px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Statistic title="Total Unique Items" value={stats.uniqueItems} valueStyle={{ color: '#1890ff' }} />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic title="Total Quantity" value={stats.totalQuantity} precision={2} valueStyle={{ color: '#722ed1' }} />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic title="Sub Total" value={subTotal} prefix="₹" precision={2} valueStyle={{ color: '#1890ff', fontSize: '18px', fontWeight: 'bold' }} />
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
          footer={() => <Button type="dashed" onClick={addItem} icon={<PlusOutlined />} block>Add Material</Button>}
        />
      </Form.Item>

      <div style={{ display: 'flex', gap: '20px', marginBottom: 16, flexWrap: 'wrap' }}>
        <Form.Item label="Tax %" name="taxRate" style={{ flex: 1, minWidth: '150px' }}>
          <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="Tax Rate" onChange={handleTaxRateChange} suffix="%" />
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

      <Form.Item name="subTotal" hidden><InputNumber /></Form.Item>
      <Form.Item name="taxTotal" hidden><InputNumber /></Form.Item>
      <Form.Item name="totalAmount" hidden><InputNumber /></Form.Item>
      <Form.Item label="Terms & Conditions" name="terms"><Input.TextArea rows={3} placeholder="Terms..." /></Form.Item>
      <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} placeholder="Notes..." /></Form.Item>
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
        { title: 'PO Number', key: 'number', render: (_, record) => `PO-${record?.year || ''}-${String(record?.number || '').padStart(4, '0')}` },
        { title: 'Project', key: 'project', render: (_, r) => (r?.projectId && typeof r.projectId === 'object') ? (r.projectId.projectCode ? `${r.projectId.name} (${r.projectId.projectCode})` : r.projectId.name) : (r?.referenceRequirement?.projectId && typeof r.referenceRequirement?.projectId === 'object') ? r.referenceRequirement.projectId.name : '-' },
        { title: 'Supplier', key: 'supplier', render: (_, r) => (r?.supplier && typeof r.supplier === 'object') ? r.supplier?.name || '-' : r?.supplier || '-' },
        { title: 'Date', dataIndex: 'date', render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-') },
        { title: 'Status', dataIndex: 'status', render: (status) => <Tag>{status || '-'}</Tag> },
        { title: 'Total', dataIndex: 'totalAmount', render: (val) => `₹${(val || 0).toLocaleString('en-IN')}` },
    ],
  };

  return <CrudModule config={config} createForm={<PurchaseOrderForm />} updateForm={<PurchaseOrderForm isUpdateForm={true} />} />;
}