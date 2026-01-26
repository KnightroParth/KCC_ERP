import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, InputNumber, Table, Tag, message, Input, DatePicker, Select, Button, Space } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import CrudModule from '@/modules/CrudModule/CrudModule';
import SelectAsync from '@/components/SelectAsync';
import { request } from '@/request';
import dayjs from 'dayjs';
import useFetch from '@/hooks/useFetch';
import useDebounce from '@/hooks/useDebounce';
import { generateGRNPDF } from '@/utils/pdfGenerator';
import { useSelector } from 'react-redux';
import { selectCurrentItem } from '@/redux/crud/selectors';

// Custom Purchase Order Select Component with proper formatting
function PurchaseOrderSelect({ onChange, value }) {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  const [currentValue, setCurrentValue] = useState(undefined);

  useDebounce(
    () => {
      setDebouncedSearchValue(searchValue);
    },
    500,
    [searchValue]
  );

  const fetchData = useCallback(() => {
    const options = { items: 100 }; // Get more items for dropdown
    if (debouncedSearchValue && debouncedSearchValue.trim()) {
      options.fields = 'notes';
      options.q = debouncedSearchValue.trim();
      return request.search({ entity: 'inventory/purchase-order', options });
    }
    return request.list({ entity: 'inventory/purchase-order', options });
  }, [debouncedSearchValue]);

  const { result, isLoading } = useFetch(fetchData);

  useEffect(() => {
    // Handle value from Form.Item
    if (value !== undefined && value !== null) {
      const val = typeof value === 'object' ? value?._id || value : value;
      setCurrentValue(val);
    } else {
      setCurrentValue(undefined);
    }
  }, [value]);

  const handleSelectChange = useCallback((newValue) => {
    setCurrentValue(newValue);
    if (onChange) onChange(newValue);
  }, [onChange]);

  const handleSearch = useCallback((searchText) => {
    setSearchValue(searchText || '');
  }, []);

  const options = useMemo(() => {
    if (!Array.isArray(result)) return [];
    return result.map((po) => {
      const poNumber = po?.number ? String(po.number).padStart(4, '0') : '0000';
      const poYear = po?.year || new Date().getFullYear();
      const poDate = po?.date ? dayjs(po.date).format('DD/MM/YYYY') : '';
      const supplierName = po?.supplier?.name || '';
      
      // Format: PO-2026-0001 | 26/01/2026 | Supplier Name
      let label = `PO-${poYear}-${poNumber}`;
      if (poDate) label += ` | ${poDate}`;
      if (supplierName) label += ` | ${supplierName}`;

      return {
        value: po._id,
        label: label,
        po: po
      };
    });
  }, [result]);

  return (
    <Select
      loading={isLoading}
      value={currentValue}
      onChange={handleSelectChange}
      onSearch={handleSearch}
      showSearch
      filterOption={false}
      placeholder="Select Purchase Order"
      notFoundContent={isLoading ? 'Loading...' : 'No purchase orders found'}
      allowClear
      getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
    >
      {options.map((option) => (
        <Select.Option key={option.value} value={option.value}>
          {option.label}
        </Select.Option>
      ))}
    </Select>
  );
}

function GRNForm({ isUpdateForm = false }) {
  const form = Form.useFormInstance();
  const [poItems, setPoItems] = useState([]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(null);
  
  const loadPO = async (poId) => {
    try {
      const res = await request.read({ entity: 'inventory/purchase-order', id: poId });
      if (res?.result) {
        const po = res.result;
        
        // SAFETY: Extract expected delivery date with optional chaining
        if (po?.expiredDate) {
          setExpectedDeliveryDate(dayjs(po.expiredDate));
        } else {
          setExpectedDeliveryDate(null);
        }
        
        // SAFETY: Map Items with optional chaining - prevent crashes
        const items = (po?.items || []).map((item, idx) => ({
          key: idx,
          material: item?.material?._id || item?.material || null,
          materialName: item?.material?.name || 'Unknown',
          orderedQty: parseFloat(item?.quantity) || 0,
          receivedQty: parseFloat(item?.receivedQuantity) || 0,
          pendingQty: Math.max(0, (parseFloat(item?.quantity) || 0) - (parseFloat(item?.receivedQuantity) || 0)),
          rate: parseFloat(item?.rate) || 0,
          currentReceive: Math.max(0, (parseFloat(item?.quantity) || 0) - (parseFloat(item?.receivedQuantity) || 0))
        }));

        setPoItems(items);

        // Pre-fill form - include all items, but only set quantity for items with pending qty > 0
        form.setFieldsValue({
          purchaseOrder: poId,
          projectId: po?.referenceRequirement?.projectId?._id || po?.referenceRequirement?.projectId || null,
          date: dayjs(),
          items: items.map(item => ({
            material: item.material,
            quantity: item.pendingQty > 0 ? item.currentReceive : 0,
            rate: item.rate,
          })),
        });
        message.success('Purchase Order loaded');
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      message.error('Failed to load PO: ' + errorMessage);
    }
  };

  // VENDOR RATING: Calculate delivery performance status
  const getDeliveryStatus = () => {
    if (!expectedDeliveryDate) return null;
    
    const grnDate = form.getFieldValue('date');
    if (!grnDate) return null;
    
    // Calculate difference: GRN Date - PO Expected Date
    const daysDiff = dayjs(grnDate).diff(expectedDeliveryDate, 'day');
    
    if (daysDiff > 0) {
      return {
        type: 'late',
        color: 'red',
        text: `Late by ${daysDiff} ${daysDiff === 1 ? 'Day' : 'Days'}`,
        days: daysDiff
      };
    } else {
      return {
        type: 'ontime',
        color: 'green',
        text: 'On Time',
        days: 0
      };
    }
  };

  const deliveryStatus = getDeliveryStatus();

  // Watch for date changes
  const grnDate = Form.useWatch('date', form);
  useEffect(() => {
    // Trigger re-render when date changes
  }, [grnDate]);

  const updateReceivedQty = (index, value) => {
    try {
      const newItems = [...poItems];
      const item = newItems[index];
      if (!item) return;
      
      const maxQty = item?.pendingQty || 0;
      const numValue = parseFloat(value) || 0;
      
      // VALIDATION: Strict limit - if user types more than pending, reset and show error
      if (numValue > maxQty) {
        message.error(`Cannot receive more than pending quantity: ${maxQty.toFixed(2)}`);
        form.setFieldValue(['items', index, 'quantity'], maxQty);
        item.currentReceive = maxQty;
        setPoItems(newItems);
        return;
      }
      
      if (numValue < 0) {
        message.error('Quantity cannot be negative');
        form.setFieldValue(['items', index, 'quantity'], 0);
        item.currentReceive = 0;
        setPoItems(newItems);
        return;
      }
      
      item.currentReceive = numValue;
      setPoItems(newItems);
      } catch (error) {
        const errorMessage = error?.message || 'Unknown error';
        message.error('Error updating quantity: ' + errorMessage);
      }
  };

  const columns = [
    {
      title: 'Material',
      dataIndex: 'materialName',
      key: 'materialName',
      width: '25%',
      render: (text) => text || 'Unknown',
    },
    {
      title: 'Ordered',
      dataIndex: 'orderedQty',
      key: 'orderedQty',
      width: '12%',
      render: (qty) => (qty || 0).toFixed(2),
    },
    {
      title: 'Received So Far',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      width: '12%',
      render: (qty) => (qty || 0).toFixed(2),
    },
    {
      title: 'Receiving Now',
      key: 'quantity',
      width: '15%',
      render: (_, record, index) => {
        const maxQty = record?.pendingQty || 0;
        return (
          <Form.Item
            name={['items', index, 'quantity']}
            rules={[
              { required: true, message: 'Required' },
              {
                validator: (_, value) => {
                  const numValue = parseFloat(value) || 0;
                  if (numValue > maxQty) {
                    return Promise.reject(`Cannot exceed pending quantity: ${maxQty.toFixed(2)}`);
                  }
                  if (numValue < 0) {
                    return Promise.reject('Cannot be negative');
                  }
                  if (numValue === 0 && maxQty > 0) {
                    return Promise.reject('Quantity must be greater than 0');
                  }
                  return Promise.resolve();
                },
              },
            ]}
            style={{ margin: 0 }}
          >
            <InputNumber
              min={0.01}
              max={maxQty}
              step={0.01}
              style={{ width: '100%' }}
              onChange={(value) => updateReceivedQty(index, value)}
              disabled={maxQty <= 0}
              placeholder={maxQty <= 0 ? "Fully received" : "Enter quantity"}
            />
          </Form.Item>
        );
      },
    },
    {
      title: 'Remaining',
      dataIndex: 'pendingQty',
      key: 'pendingQty',
      width: '12%',
      render: (qty) => {
        const qtyValue = qty || 0;
        const color = qtyValue > 0 ? 'orange' : 'green';
        return <Tag color={color}>{qtyValue.toFixed(2)}</Tag>;
      },
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      width: '12%',
      render: (rate) => `₹${(rate || 0).toFixed(2)}`,
    },
  ];

  return (
    <>
      <Form.Item
        label="Purchase Order"
        name="purchaseOrder"
        rules={[{ required: true, message: 'Please select a Purchase Order' }]}
      >
        <PurchaseOrderSelect
          onChange={loadPO}
        />
      </Form.Item>

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
        label="Date"
        name="date"
        rules={[{ required: true, message: 'Please select date' }]}
      >
        <div>
          <DatePicker 
            style={{ width: '100%' }} 
            format="DD/MM/YYYY"
          />
          {deliveryStatus && (
            <div style={{ marginTop: 8 }}>
              <Tag color={deliveryStatus.color} style={{ fontSize: '13px', padding: '4px 12px' }}>
                {deliveryStatus.text}
              </Tag>
              {expectedDeliveryDate && (
                <span style={{ marginLeft: 8, color: '#666', fontSize: '12px' }}>
                  (Expected: {expectedDeliveryDate.format('DD/MM/YYYY')})
                </span>
              )}
            </div>
          )}
        </div>
      </Form.Item>

      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
        <Form.Item
          label="Challan No"
          name="challanNo"
          style={{ flex: 1, minWidth: '200px' }}
        >
          <Input placeholder="Enter Challan Number" />
        </Form.Item>

        <Form.Item
          label="Invoice No"
          name="invoiceNo"
          style={{ flex: 1, minWidth: '200px' }}
        >
          <Input placeholder="Enter Invoice Number" />
        </Form.Item>

        <Form.Item
          label="Storage Location"
          name="storageLocation"
          style={{ flex: 1, minWidth: '200px' }}
        >
          <Input placeholder="e.g., Warehouse A, Site Store" />
        </Form.Item>
      </div>

      {poItems.length > 0 && (
        <>
          {poItems.every(item => item.pendingQty <= 0) ? (
            <div style={{ 
              padding: '16px', 
              background: '#fff7e6', 
              border: '1px solid #ffd591', 
              borderRadius: '4px',
              marginBottom: '16px'
            }}>
              <div style={{ color: '#d46b08', fontWeight: 500, marginBottom: '8px' }}>
                ⚠️ All items in this Purchase Order have been fully received
              </div>
              <div style={{ color: '#8c8c8c', fontSize: '13px' }}>
                There are no pending quantities to receive. All items show 0.0 remaining.
              </div>
            </div>
          ) : null}
          
          <Form.Item label="Items to Receive" required>
            <Table
              dataSource={poItems}
              columns={columns}
              pagination={false}
              size="small"
              rowKey="key"
              locale={{ emptyText: 'No items to receive' }}
            />
          </Form.Item>

          <Form.Item name="items" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="type" initialValue="IN" hidden>
            <Input />
          </Form.Item>
        </>
      )}

      <Form.Item label="Notes" name="notes">
        <Input.TextArea rows={3} placeholder="Additional notes..." />
      </Form.Item>
    </>
  );
}

export default function GRN() {
  const [pdfLoading, setPdfLoading] = useState(false);
  const { result: currentItem } = useSelector(selectCurrentItem);

  const handleExportPDF = async () => {
    if (!currentItem?._id) {
      message.warning('Please select a GRN to export');
      return;
    }

    setPdfLoading(true);
    try {
      // Fetch full GRN data with populated fields
      const res = await request.read({ entity: 'inventory/transaction', id: currentItem._id });
      if (res?.success && res?.result) {
        const grn = res.result;
        await generateGRNPDF(grn);
        message.success('PDF exported successfully');
      } else {
        message.error('Failed to load GRN data');
      }
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error';
      message.error('Failed to export PDF: ' + errorMessage);
    } finally {
      setPdfLoading(false);
    }
  };

  const searchConfig = {
    displayLabels: ['date', 'type'],
    searchFields: 'notes',
  };

  const deleteModalLabels = ['date'];

  const tableActions = {
    showEdit: false,
    showDelete: true,
    position: 'right',
  };

  const dataTableColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => {
        if (!a?.date && !b?.date) return 0;
        if (!a?.date) return 1;
        if (!b?.date) return -1;
        return new Date(a.date) - new Date(b.date);
      },
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      filters: [
        { text: 'GRN (IN)', value: 'IN' },
        { text: 'Issue (OUT)', value: 'OUT' },
      ],
      onFilter: (value, record) => record.type === value,
      render: (type) => (
        <Tag color={type === 'IN' ? 'green' : 'red'}>{type === 'IN' ? 'GRN' : 'Issue'}</Tag>
      ),
    },
    {
      title: 'Project',
      key: 'project',
      sorter: (a, b) => {
        const aName = a?.projectId?.name || '';
        const bName = b?.projectId?.name || '';
        if (!aName && !bName) return 0;
        if (!aName) return 1;
        if (!bName) return -1;
        return aName.localeCompare(bName);
      },
      render: (_, record) => {
        const project = record?.projectId;
        if (!project) return '-';
        if (typeof project === 'object' && project?.name) {
          return project?.projectCode ? `${project.name} (${project.projectCode})` : project.name;
        }
        return '-';
      },
    },
    {
      title: 'PO Number',
      key: 'po',
      render: (_, record) => {
        if (record?.type === 'IN' && record?.purchaseOrder) {
          const po = record.purchaseOrder;
          if (typeof po === 'object' && po?.number) {
            return `PO-${po?.year}-${String(po.number).padStart(4, '0')}`;
          }
        }
        return '-';
      },
    },
    {
      title: 'Items Count',
      key: 'itemsCount',
      sorter: (a, b) => {
        const aLen = a?.items?.length || 0;
        const bLen = b?.items?.length || 0;
        return aLen - bLen;
      },
      render: (_, record) => record?.items?.length || 0,
    },
  ];

  const config = {
    entity: 'inventory/transaction',
    PANEL_TITLE: 'GRN (Goods Receipt Note)',
    DATATABLE_TITLE: 'GRN List',
    ADD_NEW_ENTITY: 'Receive Stock (GRN)',
    ENTITY_NAME: 'GRN',
    fields: {},
    searchConfig,
    deleteModalLabels,
    tableActions,
    dataTableColumns,
    fixHeaderPanel: (
      <Button
        type="primary"
        icon={<FilePdfOutlined />}
        onClick={handleExportPDF}
        loading={pdfLoading}
        disabled={!currentItem?._id}
      >
        Export PDF
      </Button>
    ),
  };

  return (
    <CrudModule
      config={config}
      createForm={<GRNForm />}
      updateForm={<GRNForm isUpdateForm={true} />}
    />
  );
}
