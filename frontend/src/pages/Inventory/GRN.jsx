import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Table, Tag, message, Input, DatePicker } from 'antd';
import CrudModule from '@/modules/CrudModule/CrudModule';
import SelectAsync from '@/components/SelectAsync';
import { request } from '@/request';
import dayjs from 'dayjs';

function GRNForm({ isUpdateForm = false }) {
  const form = Form.useFormInstance();
  const [poItems, setPoItems] = useState([]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(null);
  
  const loadPO = async (poId) => {
    try {
      const res = await request.read({ entity: 'inventory/purchase-order', id: poId });
      if (res?.result) {
        const po = res.result;
        
        // Extract expected delivery date
        if (po.expectedDeliveryDate) {
          setExpectedDeliveryDate(dayjs(po.expectedDeliveryDate));
        } else {
          setExpectedDeliveryDate(null);
        }
        
        // Map Items safely
        const items = (po.items || []).map((item, idx) => ({
          key: idx,
          material: item.material?._id || item.material,
          materialName: item.material?.name || 'Unknown Material',
          orderedQty: parseFloat(item.quantity) || 0,
          receivedQty: parseFloat(item.receivedQuantity) || 0,
          pendingQty: (parseFloat(item.quantity) || 0) - (parseFloat(item.receivedQuantity) || 0),
          rate: parseFloat(item.rate) || 0,
          // Default receive amount is pending amount
          currentReceive: Math.max(0, (parseFloat(item.quantity) || 0) - (parseFloat(item.receivedQuantity) || 0))
        }));

        setPoItems(items);

        // Pre-fill form
        form.setFieldsValue({
          purchaseOrder: poId,
          projectId: po.referenceRequirement?.projectId?._id || po.referenceRequirement?.projectId || null,
          date: dayjs(), // FIXED: Use dayjs() for AntD DatePicker
          items: items.map(item => ({
            material: item.material,
            quantity: item.currentReceive,
            rate: item.rate,
          })),
        });
        message.success('Purchase Order loaded');
      }
    } catch (error) {
      console.error(error);
      message.error('Failed to load PO: ' + error.message);
    }
  };

  // Calculate delivery performance status
  const getDeliveryStatus = () => {
    if (!expectedDeliveryDate) return null;
    
    const grnDate = form.getFieldValue('date');
    if (!grnDate) return null;
    
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

  // Watch for date changes to update delivery status
  const grnDate = Form.useWatch('date', form);
  useEffect(() => {
    // This will trigger re-render when date changes
  }, [grnDate]);

  const updateReceivedQty = (index, value) => {
    const newItems = [...poItems];
    const item = newItems[index];
    const maxQty = item.pendingQty;
    
    // Defensive check
    if (value > maxQty) {
       // Allow user to type but show error in UI via validator
    }
    
    // Sync to state to update UI if needed (though Form handles input)
    item.currentReceive = value;
    setPoItems(newItems);
  };

  const columns = [
    {
      title: 'Material',
      dataIndex: 'materialName',
      key: 'materialName',
      width: '30%',
    },
    {
      title: 'Ordered',
      dataIndex: 'orderedQty',
      key: 'orderedQty',
      width: '15%',
    },
    {
      title: 'Prev Received',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      width: '15%',
    },
    {
      title: 'Pending',
      dataIndex: 'pendingQty',
      key: 'pendingQty',
      width: '15%',
      render: (qty) => <Tag color={qty > 0 ? 'orange' : 'green'}>{qty}</Tag>,
    },
    {
      title: 'Receive Now',
      key: 'quantity',
      width: '20%',
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'quantity']}
          rules={[
            { required: true, message: 'Required' },
            {
              validator: (_, value) => {
                if (value > record.pendingQty) {
                  return Promise.reject(`Max pending: ${record.pendingQty}`);
                }
                if (value < 0) {
                  return Promise.reject('Cannot be negative');
                }
                return Promise.resolve();
              },
            },
          ]}
          style={{ margin: 0 }}
        >
          <InputNumber
            min={0}
            max={record.pendingQty} // Hardware limit on input
            step={0.01}
            style={{ width: '100%' }}
            onChange={(value) => updateReceivedQty(index, value)}
            disabled={record.pendingQty <= 0}
          />
        </Form.Item>
      ),
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
          displayLabels={['number', 'date']}
          outputValue="_id"
          placeholder="Select Purchase Order"
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

      {poItems.length > 0 && (
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

          {/* Hidden fields to ensure data structure on submit */}
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
        const project = record.projectId;
        if (!project) return '-';
        if (typeof project === 'object' && project.name) {
          return project.projectCode ? `${project.name} (${project.projectCode})` : project.name;
        }
        return '-';
      },
    },
    {
      title: 'PO Number',
      key: 'po',
      render: (_, record) => {
        if (record.type === 'IN' && record.purchaseOrder) {
          const po = record.purchaseOrder;
          if (typeof po === 'object' && po.number) {
            return `PO-${po.year}-${String(po.number).padStart(4, '0')}`;
          }
        }
        return '-';
      },
    },
    {
      title: 'Items Count',
      key: 'itemsCount',
      render: (_, record) => record.items?.length || 0,
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