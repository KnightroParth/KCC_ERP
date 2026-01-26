import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Button, Table, Tag, message, Input, DatePicker, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, FilePdfOutlined } from '@ant-design/icons';
import axios from 'axios';
import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { request } from '@/request';
import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';
import dayjs from 'dayjs';
import { generateConsumptionPDF } from '@/utils/pdfGenerator';
import { useSelector } from 'react-redux';
import { selectCurrentItem } from '@/redux/crud/selectors';

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
  const [items, setItems] = useState([]);
  const [stockInfo, setStockInfo] = useState({});
  const [canSave, setCanSave] = useState(true);
  const [stockErrors, setStockErrors] = useState({});

  const checkStock = async (projectId, materialId) => {
    if (!projectId || !materialId) return;

    try {
      includeToken();
      const res = await axios.get(
        `inventory/inventory/getCurrentStock?projectId=${projectId}&materialId=${materialId}`
      ).then(res => res.data).catch(err => {
        // Handle 401/500 errors gracefully
        if (err?.response?.status === 401) {
          message.error('Session expired. Please login again.');
        } else if (err?.response?.status === 500) {
          message.error('Server error. Please try again.');
        }
        return { result: null };
      });
      
      if (res?.result) {
        setStockInfo({
          ...stockInfo,
          [materialId]: res.result,
        });
      } else {
        setStockInfo({
          ...stockInfo,
          [materialId]: { currentStock: 0, material: null },
        });
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      message.error('Error checking stock: ' + errorMessage);
      setStockInfo({
        ...stockInfo,
        [materialId]: { currentStock: 0, material: null },
      });
    }
  };

  // Check if any item exceeds available stock - runs on every change
  useEffect(() => {
    const projectId = form.getFieldValue('projectId');
    if (!projectId) {
      setCanSave(true);
      setStockErrors({});
      return;
    }

    let hasInsufficientStock = false;
    const errors = {};
    
    items.forEach((item, index) => {
      if (item?.material) {
        const stock = stockInfo[item.material];
        const available = stock?.currentStock || 0;
        const requested = parseFloat(item?.quantity) || 0;
        
        if (requested > available) {
          hasInsufficientStock = true;
          errors[item.material] = `Insufficient Stock. Available: ${available.toFixed(2)} ${stock?.material?.uom || 'nos'}`;
        }
      }
    });

    setCanSave(!hasInsufficientStock);
    setStockErrors(errors);
  }, [items, stockInfo, form]);

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
    const newItems = items.filter((item) => item.key !== key);
    setItems(newItems);
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
      width: '30%',
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
                onChange={(value) => updateItem(record.key, 'material', value)}
              />
            </Form.Item>
            {record.material && stock && (
              <div style={{ marginTop: 4, fontSize: '12px', color: available > 0 ? '#52c41a' : '#ff4d4f' }}>
                Available: {available.toFixed(2)} {stock.material?.uom || 'nos'}
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
      title: 'Available Stock',
      key: 'stock',
      width: '15%',
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
      width: '20%',
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
                  const numValue = parseFloat(value) || 0;
                  if (numValue > maxQty) {
                    return Promise.reject(`Insufficient Stock. Available: ${maxQty.toFixed(2)}`);
                  }
                  if (numValue <= 0) {
                    return Promise.reject('Quantity must be greater than 0');
                  }
                  return Promise.resolve();
                },
              },
            ]}
            style={{ margin: 0 }}
            validateStatus={exceedsStock ? 'error' : ''}
            help={exceedsStock ? `Insufficient Stock. Available: ${maxQty.toFixed(2)} ${info?.material?.uom || 'nos'}` : ''}
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
    if (projectId && items.length > 0) {
      items.forEach(item => {
        if (item?.material) {
          checkStock(projectId, item.material);
        }
      });
    }
  }, [form.getFieldValue('projectId'), items.length]);

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
        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
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
            rowKey="key"
            locale={{ emptyText: 'No items added. Click "Add Material" to add items.' }}
          />
        </Form.Item>
        {!canSave && (
          <div style={{ marginTop: 8, padding: 8, background: '#fff2e8', border: '1px solid #ffbb96', borderRadius: 4 }}>
            <Tag color="error">⚠️ Cannot save: One or more items exceed available stock</Tag>
            <div style={{ marginTop: 4, fontSize: '12px', color: '#ff4d4f' }}>
              Please adjust quantities to match available stock before saving.
            </div>
          </div>
        )}
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
  const [pdfLoading, setPdfLoading] = useState(false);
  const { result: currentItem } = useSelector(selectCurrentItem);
  const entity = 'inventory/transaction';

  const handleExportPDF = async () => {
    if (!currentItem?._id) {
      message.warning('Please select a consumption record to export');
      return;
    }

    setPdfLoading(true);
    try {
      const res = await request.read({ entity: 'inventory/transaction', id: currentItem._id });
      if (res?.success && res?.result) {
        const consumption = res.result;
        await generateConsumptionPDF(consumption);
        message.success('PDF exported successfully');
      } else {
        message.error('Failed to load consumption data');
      }
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error';
      message.error('Failed to export PDF: ' + errorMessage);
    } finally {
      setPdfLoading(false);
    }
  };

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
      sorter: (a, b) => {
        if (!a?.date && !b?.date) return 0;
        if (!a?.date) return 1;
        if (!b?.date) return -1;
        return new Date(a.date) - new Date(b.date);
      },
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
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
      title: 'Issued To',
      dataIndex: 'issuedTo',
      key: 'issuedTo',
      sorter: (a, b) => {
        const aVal = a?.issuedTo || '';
        const bVal = b?.issuedTo || '';
        if (!aVal && !bVal) return 0;
        if (!aVal) return 1;
        if (!bVal) return -1;
        return aVal.localeCompare(bVal);
      },
    },
    {
      title: 'Work Activity',
      dataIndex: 'workActivity',
      key: 'workActivity',
      render: (activity) => activity ? <Tag color="blue">{activity}</Tag> : '-',
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
    PANEL_TITLE: 'Consumption (Issue Stock)',
    DATATABLE_TITLE: 'Consumption List',
    ADD_NEW_ENTITY: 'Issue Stock',
    ENTITY_NAME: 'Consumption',
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
      createForm={<ConsumptionForm />}
      updateForm={<ConsumptionForm isUpdateForm={true} />}
    />
  );
}
