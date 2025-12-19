// frontend/src/pages/Inventory/Consumption.jsx

import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Button, Table, Tag, message, Input, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import storePersist from '@/redux/storePersist';

function ConsumptionForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const [items, setItems] = useState([]);
  const [stockInfo, setStockInfo] = useState({});

  const checkStock = async (projectId, materialId) => {
    if (!projectId || !materialId) return;

    try {
      const auth = storePersist.get('auth');
      const token = auth?.current?.token;
      
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:8888/'}api/inventory/inventory/getCurrentStock?projectId=${projectId}&materialId=${materialId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      ).then(res => res.data).catch(err => ({ result: null }));
      
      if (res?.result) {
        setStockInfo({
          ...stockInfo,
          [materialId]: res.result,
        });
      }
    } catch (error) {
      console.error('Error checking stock:', error);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        key: Date.now(),
        material: null,
        quantity: 1,
        unit: 'nos',
      },
    ]);
  };

  const removeItem = (key) => {
    setItems(items.filter((item) => item.key !== key));
    const newStockInfo = { ...stockInfo };
    const removedItem = items.find(item => item.key === key);
    if (removedItem?.material) {
      delete newStockInfo[removedItem.material];
    }
    setStockInfo(newStockInfo);
  };

  const updateItem = (key, field, value) => {
    const newItems = items.map((item) => {
      if (item.key === key) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(newItems);

    // Check stock when material or project changes
    if (field === 'material') {
      const projectId = form.getFieldValue('projectId');
      if (projectId && value) {
        checkStock(projectId, value);
      }
    }
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
      title: 'Available Stock',
      key: 'stock',
      width: '20%',
      render: (_, record) => {
        const info = stockInfo[record.material];
        if (!info) return <Tag>-</Tag>;
        return (
          <Tag color={info.currentStock > 0 ? 'green' : 'red'}>
            {info.currentStock} {info.material?.uom || 'nos'}
          </Tag>
        );
      },
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: '20%',
      render: (_, record, index) => {
        const info = stockInfo[record.material];
        const maxQty = info?.currentStock || 0;
        
        return (
          <Form.Item
            name={['items', index, 'quantity']}
            rules={[
              { required: true, message: 'Enter quantity' },
              {
                validator: (_, value) => {
                  if (value > maxQty) {
                    return Promise.reject(`Insufficient stock. Available: ${maxQty}`);
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
              onChange={(value) => updateItem(record.key, 'quantity', value)}
            />
          </Form.Item>
        );
      },
    },
    {
      title: 'Unit',
      key: 'unit',
      width: '15%',
      render: (_, record, index) => {
        const info = stockInfo[record.material];
        return (
          <Form.Item
            name={['items', index, 'unit']}
            style={{ margin: 0 }}
          >
            <Input
              placeholder="Unit"
              value={info?.material?.uom || 'nos'}
              readOnly
            />
          </Form.Item>
        );
      },
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

  // Watch projectId changes to check stock for all items
  useEffect(() => {
    const projectId = form.getFieldValue('projectId');
    if (projectId) {
      items.forEach(item => {
        if (item.material) {
          checkStock(projectId, item.material);
        }
      });
    }
  }, [form.getFieldValue('projectId')]);

  return (
    <>
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
        label="Issued To"
        name="issuedTo"
        rules={[{ required: true, message: 'Please enter who this is issued to' }]}
      >
        <Input placeholder="e.g., Contractor Name, Department" />
      </Form.Item>

      <Form.Item
        label="Work Activity"
        name="workActivity"
      >
        <Input placeholder="e.g., Slab Casting, Wall Construction" />
      </Form.Item>

      <Form.Item
        label="Date"
        name="date"
        rules={[{ required: true, message: 'Please select date' }]}
      >
        <DatePicker style={{ width: '100%' }} />
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
        <Form.Item name="items" rules={[{ required: true, message: 'Add at least one item' }]}>
          <Table
            dataSource={items}
            columns={columns}
            pagination={false}
            size="small"
          />
        </Form.Item>
      </Form.Item>

      <Form.Item label="Notes" name="notes">
        <Input.TextArea rows={3} placeholder="Additional notes..." />
      </Form.Item>

      <Form.Item name="type" initialValue="OUT" hidden>
        <Input />
      </Form.Item>
    </>
  );
}

export default function Consumption() {
  const entity = 'inventory/transaction';

  const searchConfig = {
    displayLabels: ['date', 'issuedTo'],
    searchFields: 'notes,issuedTo,workActivity',
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
      title: 'Issued To',
      dataIndex: 'issuedTo',
      key: 'issuedTo',
    },
    {
      title: 'Work Activity',
      dataIndex: 'workActivity',
      key: 'workActivity',
    },
    {
      title: 'Items Count',
      key: 'itemsCount',
      render: (_, record) => record.items?.length || 0,
    },
  ];

  const config = {
    entity: 'inventory/transaction',
    PANEL_TITLE: 'Consumption (Issue Stock)',
    DATATABLE_TITLE: 'Consumption List',
    ADD_NEW_ENTITY: 'Issue Stock',
    ENTITY_NAME: 'Consumption',
    fields: {},
    searchConfig,
    deleteModalLabels,
    tableActions,
    dataTableColumns,
  };

  return (
    <CrudModule
      config={config}
      createForm={<ConsumptionForm />}
      updateForm={<ConsumptionForm isUpdateForm={true} />}
    />
  );
}
