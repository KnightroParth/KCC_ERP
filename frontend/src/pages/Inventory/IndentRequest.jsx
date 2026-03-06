import React, { useEffect } from 'react';
import { Form, InputNumber, Button, Table, Tag, Badge, DatePicker, Select, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import LockedProjectInput from '@/components/LockedProjectInput';
import { selectCurrentItem } from '@/redux/crud/selectors';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';
import useLanguage from '@/locale/useLanguage';

function IndentRequestForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const items = Form.useWatch('items', form) || [];
  const currentProject = useSelector(selectCurrentProject);
  const shouldLockProject = useSelector(selectShouldLockProject);

  const estimatedCost = items.reduce((sum, item) => {
    if (!item) return sum;
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.estimatedRate) || 0;
    return sum + (qty * rate);
  }, 0);

  const budgetWarning = estimatedCost > 100000 ? 'High value request - may require approval' : '';

  const { result: currentItem } = useSelector(selectCurrentItem);

  useEffect(() => {
    if (isUpdateForm && currentItem) {
      try {
        const formattedData = { ...currentItem };
        if (formattedData.requiredDate) {
          formattedData.requiredDate = dayjs(formattedData.requiredDate);
        }
        if (formattedData.projectId && typeof formattedData.projectId === 'object') {
          formattedData.projectId = formattedData.projectId._id;
        }

        // Pass objects if available, else IDs. AutoCompleteAsync will now fetch missing names.
        if (Array.isArray(formattedData.items)) {
          formattedData.items = formattedData.items.map(item => ({
            ...item,
            material: item.material
          }));
        } else {
          formattedData.items = [];
        }

        form.resetFields();
        form.setFieldsValue(formattedData);
      } catch (error) {
        console.error("Error populating form:", error);
      }
    } else if (!isUpdateForm) {
      form.resetFields();
      form.setFieldsValue({
        items: [],
        ...(shouldLockProject && currentProject ? { projectId: currentProject._id } : {}),
      });
    }
  }, [isUpdateForm, currentItem, currentProject, shouldLockProject, form]);

  return (
    <div style={{ paddingRight: 10 }}>
      <div style={{ display: 'flex', gap: '15px' }}>
        <Form.Item
          label="Project"
          name="projectId"
          rules={[{ required: true, message: 'Please select a project' }]}
          style={{ flex: 1 }}
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
          label="Required Date"
          name="requiredDate"
          rules={[{ required: true }]}
          style={{ flex: 1 }}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
      </div>

      <Form.Item
        label="Priority"
        name="priority"
        rules={[{ required: true }]}
        initialValue="Medium"
      >
        <Select>
          <Select.Option value="Low">Low</Select.Option>
          <Select.Option value="Medium">Medium</Select.Option>
          <Select.Option value="High">High</Select.Option>
          <Select.Option value="Urgent">Urgent</Select.Option>
        </Select>
      </Form.Item>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <Form.Item label="Material List" required>
            <Table
              dataSource={fields.map(field => ({
                ...field,
                ...(items[field.name] || {})
              }))}
              pagination={false}
              size="small"
              rowKey="key"
              scroll={{ x: 'max-content' }}
              sticky
              columns={[
                {
                  title: 'Material',
                  dataIndex: 'material',
                  width: 300,
                  render: (_, field) => {
                    const currentMaterial = items[field.name]?.material;
                    const key = currentMaterial?._id || field.name;

                    return (
                      <Form.Item
                        {...field}
                        name={[field.name, 'material']}
                        rules={[{ required: true, message: 'Required' }]}
                        style={{ margin: 0 }}
                      >
                        <AutoCompleteAsync
                          key={key}
                          entity="material"
                          displayLabels={['name', 'category']}
                          searchFields="name,category"
                          outputValue="_id"
                          placeholder="Search Material"
                          onChange={(id, fullOption) => {
                            form.setFieldValue(['items', field.name, 'material'], fullOption || id);
                          }}
                          value={currentMaterial}
                        />
                      </Form.Item>
                    );
                  },
                },
                {
                  title: 'Qty',
                  dataIndex: 'quantity',
                  width: 100,
                  render: (_, field) => (
                    <Form.Item
                      {...field}
                      name={[field.name, 'quantity']}
                      rules={[{ required: true }]}
                      style={{ margin: 0 }}
                    >
                      <InputNumber min={0.01} placeholder="Qty" style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: 'Rate',
                  dataIndex: 'estimatedRate',
                  width: 120,
                  render: (_, field) => (
                    <Form.Item
                      {...field}
                      name={[field.name, 'estimatedRate']}
                      style={{ margin: 0 }}
                    >
                      <InputNumber min={0} prefix="₹" placeholder="Rate" style={{ width: '100%' }} />
                    </Form.Item>
                  ),
                },
                {
                  title: '',
                  width: 50,
                  fixed: 'right',
                  render: (_, field) => (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  ),
                },
              ]}
              footer={() => (
                <Button
                  type="dashed"
                  onClick={() => add({ quantity: 1, estimatedRate: 0 })}
                  block
                  icon={<PlusOutlined />}
                >
                  Add Material
                </Button>
              )}
            />
          </Form.Item>
        )}
      </Form.List>

      {estimatedCost > 0 && (
        <div style={{ marginTop: 20 }}>
          <strong>Total Est. Cost: </strong>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
            ₹{estimatedCost.toLocaleString('en-IN')}
          </span>
          {budgetWarning && (
            <div style={{ color: '#faad14', marginTop: 5 }}>
              ⚠️ {budgetWarning}
            </div>
          )}
        </div>
      )}

      <Form.Item label="Notes" name="notes" style={{ marginTop: 20 }}>
        <Input.TextArea rows={3} placeholder="Additional notes..." />
      </Form.Item>
    </div>
  );
}

export default function IndentRequest() {
  const config = {
    entity: 'inventory/requirement',
    PANEL_TITLE: 'Indent Request',
    DATATABLE_TITLE: 'Requests List',
    ADD_NEW_ENTITY: 'Create Request',
    ENTITY_NAME: 'Indent Request',
    fields: {},
    searchConfig: {
      displayLabels: ['priority'],
      searchFields: 'notes',
    },
    deleteModalLabels: ['priority'],
    tableActions: { showEdit: true, showDelete: true },
    dataTableColumns: [
      {
        title: 'Project',
        dataIndex: ['projectId', 'name'],
        render: (text, record) => record.projectId?.name || 'N/A'
      },
      { title: 'Date', dataIndex: 'requiredDate', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
      { title: 'Priority', dataIndex: 'priority', render: (val) => <Tag color={val === 'Urgent' ? 'red' : 'blue'}>{val}</Tag> },
      { title: 'Status', dataIndex: 'status', render: (val) => <Tag>{val}</Tag> },
      { title: 'Items', render: (_, r) => r.items?.length || 0 }
    ]
  };

  return (
    <CrudModule
      config={config}
      createForm={<IndentRequestForm />}
      updateForm={<IndentRequestForm isUpdateForm={true} />}
    />
  );
}