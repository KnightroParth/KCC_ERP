import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Table, Tag, message, Input, DatePicker } from 'antd';
import { useSelector } from 'react-redux';
import CrudModule from '@/modules/CrudModule/CrudModule';
import SelectAsync from '@/components/SelectAsync';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';
import LockedProjectInput from '@/components/LockedProjectInput';
import { request } from '@/request';
import dayjs from 'dayjs';

function GRNForm({ isUpdateForm = false }) {
  const form = Form.useFormInstance();
  const currentProject = useSelector(selectCurrentProject);
  const shouldLockProject = useSelector(selectShouldLockProject);
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
        // Filter out items that are already fully received (pendingQty <= 0)
        const allItems = (po?.items || []).map((item, idx) => ({
          key: idx,
          material: item?.material?._id || item?.material || null,
          materialName: item?.material?.name || 'Unknown',
          orderedQty: parseFloat(item?.quantity) || 0,
          receivedQty: parseFloat(item?.receivedQuantity) || 0,
          pendingQty: Math.max(0, (parseFloat(item?.quantity) || 0) - (parseFloat(item?.receivedQuantity) || 0)),
          rate: parseFloat(item?.rate) || 0,
          currentReceive: Math.max(0, (parseFloat(item?.quantity) || 0) - (parseFloat(item?.receivedQuantity) || 0))
        }));

        // Only show items with pending quantity > 0
        const itemsWithPending = allItems.filter(item => item.pendingQty > 0);

        if (itemsWithPending.length === 0) {
          message.warning('All items in this Purchase Order have been fully received. No items to receive.');
          setPoItems([]);
          const projectId = (shouldLockProject && currentProject?._id) ?? (po?.referenceRequirement?.projectId?._id || po?.referenceRequirement?.projectId || null);
          form.setFieldsValue({
            purchaseOrder: poId,
            projectId,
            date: dayjs(),
            items: [],
          });
        } else {
          setPoItems(itemsWithPending);

          // Pre-fill form with only items that have pending quantity
          // Set quantity to pendingQty (or 0.01 minimum) so user can see and edit it
          const formItems = itemsWithPending.map(item => ({
            material: item.material,
            quantity: item.currentReceive > 0 ? item.currentReceive : (item.pendingQty > 0 ? Math.min(item.pendingQty, item.pendingQty) : 0.01),
            rate: item.rate,
          }));
          
          // Ensure all quantities are at least 0.01
          const validatedFormItems = formItems.map(item => ({
            ...item,
            quantity: Math.max(parseFloat(item.quantity) || 0.01, 0.01)
          }));

          const projectId = (shouldLockProject && currentProject?._id) ?? (po?.referenceRequirement?.projectId?._id || po?.referenceRequirement?.projectId || null);
          form.setFieldsValue({
            purchaseOrder: poId,
            projectId,
            date: dayjs(),
            items: validatedFormItems,
          });
          
          // Force form to recognize the items field
          form.setFieldValue('items', validatedFormItems);
        }
        message.success('Purchase Order loaded');
      }
    } catch (error) {
      console.error(error);
      message.error('Failed to load PO: ' + (error?.message || 'Unknown error'));
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

  // Sync poItems to form items field whenever poItems changes
  useEffect(() => {
    if (poItems.length > 0) {
      const formItems = poItems.map(item => ({
        material: item.material,
        quantity: item.currentReceive >= 0.01 ? item.currentReceive : (item.pendingQty > 0 ? item.pendingQty : 0.01),
        rate: item.rate,
      }));
      form.setFieldValue('items', formItems);
    }
  }, [poItems, form]);

  const updateReceivedQty = (index, value) => {
    const newItems = [...poItems];
    const item = newItems[index];
    const maxQty = item?.pendingQty || 0;
    
    // VALIDATION: Strict limit - if user types more than pending, reset and show error
    if (value !== null && value !== undefined) {
      const qty = parseFloat(value);
      
      if (isNaN(qty)) {
        return; // Invalid input, don't update
      }
      
      if (qty > maxQty) {
        message.error(`Cannot receive more than pending quantity: ${maxQty.toFixed(2)}`);
        const validQty = maxQty > 0 ? maxQty : 0.01;
        form.setFieldValue(['items', index, 'quantity'], validQty);
        item.currentReceive = validQty;
        setPoItems(newItems);
        // Sync back to form items
        syncItemsToForm(newItems);
        return;
      }
      
      if (qty < 0.01 && qty !== 0) {
        message.error('Minimum quantity is 0.01');
        form.setFieldValue(['items', index, 'quantity'], 0.01);
        item.currentReceive = 0.01;
        setPoItems(newItems);
        // Sync back to form items
        syncItemsToForm(newItems);
        return;
      }
      
      if (qty < 0) {
        message.error('Quantity cannot be negative');
        form.setFieldValue(['items', index, 'quantity'], 0.01);
        item.currentReceive = 0.01;
        setPoItems(newItems);
        // Sync back to form items
        syncItemsToForm(newItems);
        return;
      }
      
      // Only update if value is valid (>= 0.01 or exactly 0 for clearing)
      if (qty >= 0.01 || qty === 0) {
        item.currentReceive = qty;
        setPoItems(newItems);
        // Sync back to form items
        syncItemsToForm(newItems);
      }
    }
  };

  // Helper function to sync poItems state to form items field
  const syncItemsToForm = (items) => {
    const formItems = items.map(item => ({
      material: item.material,
      quantity: item.currentReceive >= 0.01 ? item.currentReceive : 0.01,
      rate: item.rate,
    }));
    form.setFieldValue('items', formItems);
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
                  const qty = parseFloat(value);
                  if (value === null || value === undefined || isNaN(qty)) {
                    return Promise.reject('Quantity is required');
                  }
                  if (qty < 0.01) {
                    return Promise.reject('Minimum quantity is 0.01');
                  }
                  if (qty > maxQty) {
                    return Promise.reject(`Max: ${maxQty.toFixed(2)}`);
                  }
                  if (qty < 0) {
                    return Promise.reject('Cannot be negative');
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
              onChange={(value) => {
                updateReceivedQty(index, value);
                // Also update form field directly
                form.setFieldValue(['items', index, 'quantity'], value || 0.01);
              }}
              disabled={maxQty <= 0}
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
        <SelectAsync
          entity="inventory/purchase-order"
          displayLabels={['number', 'year']}
          outputValue="_id"
          placeholder="Select Purchase Order"
          onChange={loadPO}
          formatter={(po) => {
            if (po?.year && po?.number) {
              return `PO-${po.year}-${String(po.number).padStart(4, '0')}`;
            }
            if (po?.number) {
              return `PO-${po.number}`;
            }
            return 'Unknown PO';
          }}
        />
      </Form.Item>

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

      {poItems.length > 0 ? (
        <>
          <Form.Item label="Items to Receive" required>
            <Table
              dataSource={poItems}
              columns={columns}
              pagination={false}
              size="small"
              rowKey="key"
            />
          </Form.Item>

          <Form.Item 
            name="items" 
            hidden
            rules={[
              {
                validator: () => {
                  const items = form.getFieldValue('items');
                  if (!items || !Array.isArray(items) || items.length === 0) {
                    return Promise.reject('Please select a Purchase Order with items to receive');
                  }
                  const validItems = items.filter(item => {
                    if (!item || !item.material) return false;
                    const qty = parseFloat(item.quantity);
                    return qty !== null && qty !== undefined && !isNaN(qty) && qty >= 0.01;
                  });
                  if (validItems.length === 0) {
                    return Promise.reject('Please enter quantity (>= 0.01) for at least one item');
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="type" initialValue="IN" hidden>
            <Input />
          </Form.Item>
        </>
      ) : (
        <Form.Item>
          <div style={{ padding: '20px', textAlign: 'center', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
            <p style={{ margin: 0, color: '#d46b08' }}>
              <strong>No items available to receive.</strong>
              <br />
              All items in this Purchase Order have been fully received, or please select a Purchase Order with pending items.
            </p>
          </div>
          <Form.Item name="items" hidden initialValue={[]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" initialValue="IN" hidden>
            <Input />
          </Form.Item>
        </Form.Item>
      )}

      <Form.Item label="Notes" name="notes">
        <Input.TextArea rows={3} placeholder="Additional notes..." />
      </Form.Item>
    </>
  );
}

export default function GRN() {
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
      title: 'GRN Number',
      key: 'grnNumber',
      width: 150,
      render: (_, record) => {
        if (record?._id && record?.date) {
          const year = dayjs(record.date).year();
          // Extract last 6 chars of _id for unique identifier
          const idSuffix = record._id.toString().slice(-6).toUpperCase();
          return `GRN-${year}-${idSuffix}`;
        }
        return '-';
      },
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'IN' ? 'green' : 'red'}>{type === 'IN' ? 'GRN' : 'Issue'}</Tag>
      ),
    },
    {
      title: 'Project',
      key: 'project',
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
          if (typeof po === 'object' && po !== null) {
            // Check if year exists, if not try to get from date or use current year
            let year = po.year;
            if (!year && po.date) {
              year = dayjs(po.date).year();
            }
            if (!year) {
              year = dayjs().year(); // Fallback to current year
            }
            if (po.number !== undefined && po.number !== null) {
              return `PO-${year}-${String(po.number).padStart(4, '0')}`;
            }
            // If number is missing, show what we have
            return `PO-${year}-XXXX`;
          } else if (typeof po === 'string') {
            // If it's just an ID string, show a placeholder
            return 'PO-XXXX-XXXX';
          }
        }
        return '-';
      },
    },
    {
      title: 'Items Count',
      key: 'itemsCount',
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
  };

  return (
    <CrudModule
      config={config}
      createForm={<GRNForm />}
      updateForm={<GRNForm isUpdateForm={true} />}
    />
  );
}
