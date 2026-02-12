import React, { useState, useEffect, useRef } from 'react';
import {
  Form,
  InputNumber,
  Button,
  Table,
  Tag,
  message,
  Input,
  DatePicker,
  Select,
  Spin,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import axios from 'axios';
import CrudModule from '@/modules/CrudModule/CrudModule';
import SelectAsync from '@/components/SelectAsync';
import LockedProjectInput from '@/components/LockedProjectInput';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';
import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';
import dayjs from 'dayjs';

function includeToken() {
  axios.defaults.baseURL = API_BASE_URL;
  axios.defaults.withCredentials = true;
  const auth = storePersist.get('auth');
  if (auth) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${auth.current.token}`;
  }
}

// Fetch materials available AT the selected source site only (project inventory, not Material Library)
async function fetchMaterialsAtSite(projectId) {
  if (!projectId) return [];
  try {
    includeToken();
    const res = await axios
      .get(`inventory/inventory/dashboard?projectId=${projectId}`)
      .then((r) => r.data)
      .catch(() => ({ result: null }));
    const items = res?.result?.items || [];
    return items
      .filter((inv) => (inv.currentStock || 0) > 0)
      .map((inv) => ({
        materialId: inv.material?._id || inv.material,
        name: inv.material?.name || 'Unknown',
        category: inv.material?.category,
        uom: inv.material?.uom || 'nos',
        currentStock: inv.currentStock || 0,
      }));
  } catch (e) {
    return [];
  }
}

function SiteTransferForm() {
  const form = Form.useFormInstance();
  const currentProject = useSelector(selectCurrentProject);
  const shouldLockProject = useSelector(selectShouldLockProject);
  const [items, setItems] = useState([]);
  const [materialsAtSourceSite, setMaterialsAtSourceSite] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [canSave, setCanSave] = useState(true);
  const [stockErrors, setStockErrors] = useState({});
  const prevFormItemsLengthRef = useRef(0);
  const prevFromProjectIdRef = useRef(undefined);

  useEffect(() => {
    if (shouldLockProject && currentProject) {
      form.setFieldsValue({ fromProjectId: currentProject._id });
    }
  }, [shouldLockProject, currentProject, form]);

  const fromProjectId = Form.useWatch('fromProjectId', form);
  const toProjectId = Form.useWatch('toProjectId', form);
  const formItems = Form.useWatch('items', form);

  // When editing, sync form's items (from setFieldsValue) into local state so the table shows them
  useEffect(() => {
    const formItemsArray = Array.isArray(formItems) ? formItems : [];
    if (formItemsArray.length === 0) {
      prevFormItemsLengthRef.current = 0;
      setItems([]);
      return;
    }
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
  }, [formItems]);

  // When user selects source site (e.g. Lotus Green), load only materials available at THAT site.
  // Don't clear form items when fromProjectId is first undefined (edit mode load) - only clear when user clears the selection.
  useEffect(() => {
    if (!fromProjectId) {
      setMaterialsAtSourceSite([]);
      setItems([]);
      if (prevFromProjectIdRef.current != null) {
        form.setFieldValue('items', []);
      }
      prevFromProjectIdRef.current = fromProjectId;
      return;
    }
    prevFromProjectIdRef.current = fromProjectId;
    setLoadingMaterials(true);
    fetchMaterialsAtSite(fromProjectId)
      .then((list) => {
        setMaterialsAtSourceSite(list);
        if (list.length === 0) {
          message.info('No materials with stock at this site. Receive stock (GRN) or Issue Stock first.');
        }
      })
      .catch(() => {
        setMaterialsAtSourceSite([]);
        message.error('Failed to load materials at source site');
      })
      .finally(() => setLoadingMaterials(false));
  }, [fromProjectId, form]);

  // Build stockInfo from materialsAtSourceSite (we already have currentStock per material)
  const stockInfo = materialsAtSourceSite.reduce((acc, m) => {
    acc[m.materialId] = {
      currentStock: m.currentStock,
      material: { uom: m.uom, name: m.name },
    };
    return acc;
  }, {});

  useEffect(() => {
    let hasInsufficient = false;
    const errors = {};
    items.forEach((item) => {
      if (item.material) {
        const available = stockInfo[item.material]?.currentStock ?? 0;
        const requested = parseFloat(item.quantity) || 0;
        if (requested > available) {
          hasInsufficient = true;
          errors[item.material] = `Insufficient at source site. Available: ${available.toFixed(2)}`;
        }
      }
    });
    setCanSave(!hasInsufficient);
    setStockErrors(errors);
  }, [items, stockInfo]);

  const addItem = () => {
    const newItems = [
      ...items,
      { key: Date.now(), material: null, quantity: 1, unit: 'nos' },
    ];
    setItems(newItems);
    form.setFieldValue('items', newItems);
  };

  const removeItem = (key) => {
    const removed = items.find((item) => item.key === key);
    const newItems = items.filter((item) => item.key !== key);
    setItems(newItems);
    form.setFieldValue('items', newItems);
    if (removed?.material) {
      setStockErrors((prev) => {
        const next = { ...prev };
        delete next[removed.material];
        return next;
      });
    }
  };

  const updateItem = (key, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  };

  const columns = [
    {
      title: 'Material (from source site only)',
      key: 'material',
      width: '32%',
      render: (_, record, index) => {
        const stock = record.material ? stockInfo[record.material] : null;
        const available = stock?.currentStock ?? 0;
        const error = record.material ? stockErrors[record.material] : null;
        const options = materialsAtSourceSite.map((m) => ({
          value: m.materialId,
          label: `${m.name} — ${m.currentStock.toFixed(2)} ${m.uom} available`,
        }));
        return (
          <div>
            <Form.Item
              name={['items', index, 'material']}
              rules={[{ required: true, message: 'Select material from source site' }]}
              style={{ margin: 0 }}
            >
              <Select
                placeholder={fromProjectId ? (loadingMaterials ? 'Loading...' : 'Select material at this site') : 'Select source site first'}
                options={options}
                loading={loadingMaterials}
                showSearch
                optionFilterProp="label"
                allowClear
                onChange={(value) => {
                  updateItem(record.key, 'material', value);
                  const mat = materialsAtSourceSite.find((m) => m.materialId === value);
                  if (mat) form.setFieldValue(['items', index, 'unit'], mat.uom);
                }}
                notFoundContent={loadingMaterials ? <Spin size="small" /> : (fromProjectId ? 'No materials with stock at this site' : 'Select source site first')}
              />
            </Form.Item>
            {record.material && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: available > 0 ? '#52c41a' : '#ff4d4f',
                }}
              >
                At source site: {available.toFixed(2)} {stock?.material?.uom || 'nos'}
              </div>
            )}
            {error && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#ff4d4f' }}>{error}</div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: '22%',
      render: (_, record, index) => {
        const stock = stockInfo[record.material];
        const maxQty = stock?.currentStock ?? 0;
        return (
          <Form.Item
            name={['items', index, 'quantity']}
            rules={[
              { required: true, message: 'Enter quantity' },
              {
                validator: (_, value) => {
                  if (value > maxQty)
                    return Promise.reject(
                      `Max at source: ${maxQty.toFixed(2)}`
                    );
                  if (!value || value <= 0)
                    return Promise.reject('Quantity must be > 0');
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
              onChange={(v) => updateItem(record.key, 'quantity', v)}
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
          <Form.Item name={['items', index, 'unit']} style={{ margin: 0 }}>
            <Input
              placeholder="Unit"
              value={info?.material?.uom || 'nos'}
              readOnly
              style={{ minWidth: 80, fontSize: 14 }}
            />
          </Form.Item>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
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

  useEffect(() => {
    if (!form.getFieldValue('date')) {
      form.setFieldValue('date', dayjs());
    }
  }, [form]);

  return (
    <>
      <Form.Item
        label="From Site (Source)"
        name="fromProjectId"
        rules={[{ required: true, message: 'Select source site' }]}
        initialValue={shouldLockProject && currentProject ? currentProject._id : undefined}
      >
        {shouldLockProject && currentProject ? (
          <LockedProjectInput />
        ) : (
          <SelectAsync
            entity="project"
            displayLabels={['name', 'projectCode']}
            outputValue="_id"
            placeholder="Select source project/site"
          />
        )}
      </Form.Item>

      <Form.Item
        label="To Site (Destination)"
        name="toProjectId"
        rules={[
          { required: true, message: 'Select destination site' },
          {
            validator: (_, value) => {
              if (value && fromProjectId && value === fromProjectId) {
                return Promise.reject('Destination must be different from source');
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <SelectAsync
          entity="project"
          displayLabels={['name', 'projectCode']}
          outputValue="_id"
          placeholder="Select destination project/site"
        />
      </Form.Item>

      <Form.Item
        label="Transfer Date"
        name="date"
        rules={[{ required: true, message: 'Select date' }]}
      >
        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
      </Form.Item>

      <Form.Item label="Materials" required>
        <Button
          type="dashed"
          onClick={addItem}
          icon={<PlusOutlined />}
          style={{ width: '100%', marginBottom: 16 }}
          disabled={!fromProjectId || materialsAtSourceSite.length === 0}
        >
          {!fromProjectId
            ? 'Select source site first'
            : materialsAtSourceSite.length === 0
              ? 'No materials at this site'
              : 'Add material from this site'}
        </Button>
        <Form.Item
          name="items"
          rules={[{ required: true, message: 'Add at least one item' }]}
        >
          <Table
            dataSource={items}
            columns={columns}
            pagination={false}
            size="small"
            rowKey="key"
          />
        </Form.Item>
        {!canSave && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              background: '#fff2e8',
              border: '1px solid #ffbb96',
              borderRadius: 4,
            }}
          >
            <Tag color="error">
              Cannot save: Insufficient stock at source site for one or more items
            </Tag>
          </div>
        )}
      </Form.Item>

      <Form.Item label="Notes" name="notes">
        <Input.TextArea rows={2} placeholder="Challan no., vehicle, remarks..." />
      </Form.Item>
    </>
  );
}

export default function SiteTransfer() {
  const entity = 'inventory/site-transfer';

  const searchConfig = {
    displayLabels: ['date'],
    searchFields: 'notes',
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
      title: 'From Site',
      key: 'fromSite',
      render: (_, record) => {
        const p = record?.fromProjectId;
        if (!p) return '-';
        if (typeof p === 'object' && p?.name)
          return p?.projectCode ? `${p.name} (${p.projectCode})` : p.name;
        return '-';
      },
    },
    {
      title: 'To Site',
      key: 'toSite',
      render: (_, record) => {
        const p = record?.toProjectId;
        if (!p) return '-';
        if (typeof p === 'object' && p?.name)
          return p?.projectCode ? `${p.name} (${p.projectCode})` : p.name;
        return '-';
      },
    },
    {
      title: 'Items',
      key: 'itemsCount',
      render: (_, record) => record?.items?.length ?? 0,
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (t) => (t ? (t.length > 40 ? t.slice(0, 40) + '…' : t) : '-'),
    },
  ];

  const config = {
    entity,
    PANEL_TITLE: 'Site Transfer',
    DATATABLE_TITLE: 'Site Transfer List',
    ADD_NEW_ENTITY: 'New Site Transfer',
    ENTITY_NAME: 'Site Transfer',
    fields: {},
    searchConfig,
    deleteModalLabels,
    tableActions,
    dataTableColumns,
  };

  return (
    <CrudModule
      config={config}
      createForm={<SiteTransferForm />}
      updateForm={<SiteTransferForm />}
    />
  );
}
