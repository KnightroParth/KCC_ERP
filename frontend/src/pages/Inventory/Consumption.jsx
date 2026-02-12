import React, { useState, useEffect, useRef } from 'react';
import { Form, InputNumber, Button, Table, Tag, message, Input, DatePicker, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useSelector } from 'react-redux';
import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import LockedProjectInput from '@/components/LockedProjectInput';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';
import { request } from '@/request';
import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';
import { WORK_CATEGORIES } from '@/config/workConfig';
import dayjs from 'dayjs';

// Work type options from planning (same as Planning "Select Work Type" dropdown)
const WORK_TYPE_OPTIONS = WORK_CATEGORIES.map((c) => ({ value: c.label, label: c.label }));

// Helper function to include token
function includeToken() {
  axios.defaults.baseURL = API_BASE_URL;
  axios.defaults.withCredentials = true;
  const auth = storePersist.get('auth');
  if (auth) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${auth.current.token}`;
  }
}

function ConsumptionForm({ isUpdateForm = false }) {
  const form = Form.useFormInstance();
  const currentProject = useSelector(selectCurrentProject);
  const shouldLockProject = useSelector(selectShouldLockProject);
  const [items, setItems] = useState([]);
  const [stockInfo, setStockInfo] = useState({});
  const [canSave, setCanSave] = useState(true);
  const [stockErrors, setStockErrors] = useState({});
  const [contractorOptions, setContractorOptions] = useState([]);
  const prevFormItemsLengthRef = useRef(0);

  useEffect(() => {
    if (!isUpdateForm && shouldLockProject && currentProject) {
      form.setFieldsValue({ projectId: currentProject._id });
    }
  }, [isUpdateForm, shouldLockProject, currentProject, form]);

  // When editing, sync form's items (from setFieldsValue) into local state so the table shows them
  const formItems = Form.useWatch('items', form);
  useEffect(() => {
    if (!isUpdateForm) return;
    const formItemsArray = Array.isArray(formItems) ? formItems : [];
    if (formItemsArray.length === 0) {
      prevFormItemsLengthRef.current = 0;
      setItems([]);
      return;
    }
    // Only sync when form just got populated from server (0 -> N items), not when user adds rows
    if (prevFormItemsLengthRef.current === 0 && formItemsArray.length > 0) {
      const normalized = formItemsArray.map((row, i) => ({
        key: row.key || row._id || `edit-row-${i}-${Date.now()}`,
        material: row.material?._id || row.material,
        quantity: row.quantity ?? 1,
        unit: row.unit || 'nos',
      }));
      setItems(normalized);
    }
    prevFormItemsLengthRef.current = formItemsArray.length;
  }, [isUpdateForm, formItems]);

  // Load all contractors (vendors) for Issued To dropdown
  useEffect(() => {
    request
      .listAll({ entity: 'vendor', options: { enabled: true } })
      .then((res) => {
        if (Array.isArray(res)) {
          setContractorOptions(res.map((v) => ({ value: v.name || v._id, label: v.name || '—' })));
        } else if (res?.result && Array.isArray(res.result)) {
          setContractorOptions(res.result.map((v) => ({ value: v.name || v._id, label: v.name || '—' })));
        }
      })
      .catch(() => setContractorOptions([]));
  }, []);

  const checkStock = async (projectId, materialId) => {
    if (!materialId) return;

    try {
      includeToken();
      // Check Material Library (Central Warehouse) stock instead of Project Inventory
      const res = await axios.get(
        `inventory/material/stock?materialId=${materialId}`
      ).then(res => res.data).catch(err => ({ result: null }));
      
      if (res?.result) {
        setStockInfo({
          ...stockInfo,
          [materialId]: {
            currentStock: res.result.openingStock || 0,
            material: res.result.material,
          },
        });
      } else {
        setStockInfo({
          ...stockInfo,
          [materialId]: { currentStock: 0, material: null },
        });
      }
    } catch (error) {
      console.error('Error checking Material Library stock:', error);
      setStockInfo({
        ...stockInfo,
        [materialId]: { currentStock: 0, material: null },
      });
    }
  };

  // Check if any item exceeds available stock in Material Library
  useEffect(() => {
    let hasInsufficientStock = false;
    const errors = {};
    
    items.forEach(item => {
      if (item.material) {
        const stock = stockInfo[item.material];
        const available = stock?.currentStock || 0; // Material Library openingStock
        const requested = parseFloat(item.quantity) || 0;
        
        if (requested > available) {
          hasInsufficientStock = true;
          errors[item.material] = `Insufficient Stock in Material Library. Available: ${available.toFixed(2)}`;
        }
      }
    });

    setCanSave(!hasInsufficientStock);
    setStockErrors(errors);
  }, [items, stockInfo]);

  const addItem = () => {
    const newItem = {
      key: Date.now(),
      material: null,
      quantity: 1,
      unit: 'nos',
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    form.setFieldValue('items', newItems);
  };

  const removeItem = (key) => {
    const newItems = items.filter((item) => item.key !== key);
    setItems(newItems);
    form.setFieldValue('items', newItems);
    const newStockInfo = { ...stockInfo };
    const newErrors = { ...stockErrors };
    const removedItem = items.find(item => item.key === key);
    if (removedItem?.material) {
      delete newStockInfo[removedItem.material];
      delete newErrors[removedItem.material];
    }
    setStockInfo(newStockInfo);
    setStockErrors(newErrors);
  };

  const updateItem = (key, field, value) => {
    const newItems = items.map((item) => {
      if (item.key === key) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(newItems);
    form.setFieldValue('items', newItems);

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
      width: '32%',
      render: (_, record, index) => {
        const stock = record.material ? stockInfo[record.material] : null;
        const available = stock?.currentStock || 0;
        const error = record.material ? stockErrors[record.material] : null;
        
        return (
          <div>
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
                size="large"
                style={{ width: '100%', minHeight: 44, fontSize: 15 }}
                dropdownMinWidth={400}
                dropdownMatchSelectWidth={false}
                onChange={(value) => {
                  updateItem(record.key, 'material', value);
                  if (value) {
                    checkStock(null, value); // Check Material Library stock when material is selected
                  }
                }}
              />
            </Form.Item>
            {record.material && stock && (
              <div style={{ marginTop: 4, fontSize: '12px', color: available > 0 ? '#52c41a' : '#ff4d4f' }}>
                Available in Material Library: {available.toFixed(2)} {stock.material?.uom || 'nos'}
              </div>
            )}
            {error && (
              <div style={{ marginTop: 4, fontSize: '12px', color: '#ff4d4f' }}>
                {error}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Available in Material Library',
      key: 'stock',
      width: '18%',
      render: (_, record) => {
        const info = stockInfo[record.material];
        if (!info || !record.material) return <Tag>-</Tag>;
        const color = info.currentStock > 0 ? 'green' : 'red';
        return (
          <Tag color={color}>
            {info.currentStock.toFixed(2)} {info.material?.uom || 'nos'}
          </Tag>
        );
      },
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: '18%',
      minWidth: 140,
      render: (_, record, index) => {
        const info = stockInfo[record.material];
        const maxQty = info?.currentStock || 0;
        const currentQty = items[index]?.quantity || 0;
        const exceedsStock = currentQty > maxQty;
        
        return (
          <Form.Item
            name={['items', index, 'quantity']}
            rules={[
              { required: true, message: 'Enter quantity' },
              {
                validator: (_, value) => {
                  if (value > maxQty) {
                    return Promise.reject(`Insufficient Stock for Construction Site. Available: ${maxQty.toFixed(2)}`);
                  }
                  if (value <= 0) {
                    return Promise.reject('Quantity must be greater than 0');
                  }
                  return Promise.resolve();
                },
              },
            ]}
            style={{ margin: 0 }}
            validateStatus={exceedsStock ? 'error' : ''}
            help={exceedsStock ? `Insufficient Stock for Construction Site. Available: ${maxQty.toFixed(2)}` : ''}
          >
            <InputNumber
              size="large"
              min={0.01}
              max={maxQty}
              step={0.01}
              style={{ width: '100%', minWidth: 120, fontSize: 15 }}
              onChange={(value) => updateItem(record.key, 'quantity', value)}
            />
          </Form.Item>
        );
      },
    },
    {
      title: 'Unit',
      key: 'unit',
      width: '16%',
      minWidth: 140,
      render: (_, record, index) => {
        const info = stockInfo[record.material];
        return (
          <Form.Item
            name={['items', index, 'unit']}
            style={{ margin: 0 }}
          >
            <Input
              size="large"
              placeholder="Unit"
              value={info?.material?.uom || 'nos'}
              readOnly
              style={{ minWidth: 120, fontSize: 15 }}
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

  // Watch material changes to check Material Library stock
  useEffect(() => {
    items.forEach(item => {
      if (item.material) {
        checkStock(null, item.material); // No projectId needed, checking Material Library
      }
    });
  }, [items]);

  const fieldStyle = { width: '100%', minHeight: 44, fontSize: 15 };

  return (
    <>
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
            size="large"
            style={fieldStyle}
          />
        )}
      </Form.Item>

      <Form.Item
        label="Issued To"
        name="issuedTo"
        rules={[{ required: true, message: 'Please select contractor' }]}
      >
        <Select
          size="large"
          placeholder="Select contractor"
          allowClear
          showSearch
          optionFilterProp="label"
          options={contractorOptions}
          notFoundContent="No contractors loaded"
          style={fieldStyle}
        />
      </Form.Item>

      <Form.Item
        label="Work Activity"
        name="workActivity"
      >
        <Select
          size="large"
          placeholder="Select work type (from Planning)"
          allowClear
          showSearch
          optionFilterProp="label"
          options={WORK_TYPE_OPTIONS}
          notFoundContent="No work types"
          style={fieldStyle}
        />
      </Form.Item>

      <Form.Item
        label="Date"
        name="date"
        rules={[{ required: true, message: 'Please select date' }]}
      >
        <DatePicker size="large" style={{ width: '100%', fontSize: 15 }} format="DD/MM/YYYY" />
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
            size="middle"
            rowKey="key"
          />
        </Form.Item>
        {!canSave && (
          <div style={{ marginTop: 8, padding: 8, background: '#fff2e8', border: '1px solid #ffbb96', borderRadius: 4 }}>
            <Tag color="error">Cannot save: Insufficient Stock in Material Library (Central Warehouse)</Tag>
          </div>
        )}
      </Form.Item>

      <Form.Item label="Notes" name="notes">
        <Input.TextArea rows={4} placeholder="Additional notes..." style={{ fontSize: 15 }} />
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
    showEdit: true,
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
      title: 'Issued To',
      dataIndex: 'issuedTo',
      key: 'issuedTo',
      ellipsis: false,
      width: 160,
    },
    {
      title: 'Work Activity',
      dataIndex: 'workActivity',
      key: 'workActivity',
      ellipsis: false,
      width: 180,
      render: (val) => (val && String(val).trim() ? val : '—'),
    },
    {
      title: 'Items Count',
      key: 'itemsCount',
      width: 100,
      render: (_, record) => record?.items?.length || 0,
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
