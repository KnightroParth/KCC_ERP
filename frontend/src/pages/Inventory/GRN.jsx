// frontend/src/pages/Inventory/GRN.jsx

import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Button, Table, Tag, message, Select, Input, DatePicker } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import CrudModule from '@/modules/CrudModule/CrudModule';
import SelectAsync from '@/components/SelectAsync';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';

function GRNForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const [poItems, setPoItems] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);

  const loadPO = async (poId) => {
    try {
      const res = await request.read({ entity: 'inventory/purchase-order', id: poId });
      if (res?.result) {
        const po = res.result;
        setSelectedPO(po);
        const items = po.items.map((item, idx) => ({
          key: idx,
          material: item.material?._id || item.material,
          materialName: item.material?.name || 'Unknown',
          orderedQty: item.quantity,
          receivedQty: item.receivedQuantity || 0,
          pendingQty: item.quantity - (item.receivedQuantity || 0),
          rate: item.rate,
          receivedQuantity: Math.min(item.quantity - (item.receivedQuantity || 0), item.quantity),
        }));
        setPoItems(items);
        form.setFieldsValue({
          purchaseOrder: poId,
          projectId: po.referenceRequirement?.projectId || null,
          date: new Date(),
          items: items.map(item => ({
            material: item.material,
            quantity: item.receivedQuantity,
            rate: item.rate,
            unit: item.material?.uom || 'nos',
          })),
        });
        message.success('Purchase Order loaded');
      }
    } catch (error) {
      message.error('Failed to load PO: ' + error.message);
    }
  };

  const updateReceivedQty = (index, value) => {
    const newItems = [...poItems];
    const item = newItems[index];
    const maxQty = item.pendingQty;
    
    if (value > maxQty) {
      message.warning(`Cannot receive more than ${maxQty} (pending quantity)`);
      value = maxQty;
    }
    
    item.receivedQuantity = value;
    setPoItems(newItems);
    
    // Update form values
    const formItems = form.getFieldValue('items') || [];
    formItems[index] = {
      ...formItems[index],
      quantity: value,
    };
    form.setFieldsValue({ items: formItems });
  };

  const columns = [
    {
      title: 'Material',
      dataIndex: 'materialName',
      key: 'materialName',
      width: '30%',
    },
    {
      title: 'Ordered Qty',
      dataIndex: 'orderedQty',
      key: 'orderedQty',
      width: '15%',
    },
    {
      title: 'Already Received',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      width: '15%',
    },
    {
      title: 'Pending Qty',
      dataIndex: 'pendingQty',
      key: 'pendingQty',
      width: '15%',
      render: (qty) => <Tag color={qty > 0 ? 'orange' : 'green'}>{qty}</Tag>,
    },
    {
      title: 'Received Qty',
      key: 'receivedQuantity',
      width: '20%',
      render: (_, record, index) => (
        <Form.Item
          name={['items', index, 'quantity']}
          rules={[
            { required: true, message: 'Enter received quantity' },
            {
              validator: (_, value) => {
                if (value > record.pendingQty) {
                  return Promise.reject(`Max: ${record.pendingQty}`);
                }
                return Promise.resolve();
              },
            },
          ]}
          style={{ margin: 0 }}
        >
          <InputNumber
            min={0}
            max={record.pendingQty}
            step={0.01}
            style={{ width: '100%' }}
            onChange={(value) => updateReceivedQty(index, value)}
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
        <DatePicker style={{ width: '100%' }} />
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

      <Form.Item name="items" rules={[{ required: true, message: 'Items are required' }]}>
        <Input hidden />
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
  const entity = 'inventory/transaction';

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
      render: (date) => (date ? new Date(date).toLocaleDateString() : '-'),
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
