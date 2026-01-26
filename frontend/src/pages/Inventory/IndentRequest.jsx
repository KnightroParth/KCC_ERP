import React, { useEffect, useState } from 'react';
import { Form, InputNumber, Button, Table, Tag, Badge, DatePicker, Select, Input, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

import CrudModule from '@/modules/CrudModule/CrudModule';
import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import SelectAsync from '@/components/SelectAsync';
import { selectCurrentItem } from '@/redux/crud/selectors';
import useLanguage from '@/locale/useLanguage';
import { generateIndentRequestPDF } from '@/utils/pdfGenerator';
import { request } from '@/request';
import { message } from 'antd';

function IndentRequestForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const items = Form.useWatch('items', form) || [];

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
        const errorMessage = error?.message || 'Unknown error';
        message.error('Error populating form: ' + errorMessage);
      }
    } else if (!isUpdateForm) {
      form.resetFields();
      form.setFieldsValue({ items: [] });
    }
  }, [isUpdateForm, currentItem, form]);

  return (
    <div style={{ paddingRight: 10 }}>
      <div style={{ display: 'flex', gap: '15px' }}>
        <Form.Item
          label="Project"
          name="projectId"
          rules={[{ required: true, message: 'Please select a project' }]}
          style={{ flex: 1 }}
        >
          <SelectAsync
            entity="project"
            displayLabels={['name', 'projectCode']}
            outputValue="_id"
            placeholder="Select Project"
          />
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
              locale={{ emptyText: 'No materials added. Click "Add Material" to add items.' }}
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
  const [pdfLoading, setPdfLoading] = useState(false);
  const { result: currentItem } = useSelector(selectCurrentItem);

  const handleExportPDF = async () => {
    if (!currentItem?._id) {
      message.warning('Please select an indent request to export');
      return;
    }

    setPdfLoading(true);
    try {
      const res = await request.read({ entity: 'inventory/requirement', id: currentItem._id });
      if (res?.success && res?.result) {
        const indent = res.result;
        await generateIndentRequestPDF(indent);
        message.success('PDF exported successfully');
      } else {
        message.error('Failed to load indent request data');
      }
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error';
      message.error('Failed to export PDF: ' + errorMessage);
    } finally {
      setPdfLoading(false);
    }
  };

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
          sorter: (a, b) => {
            const aName = a?.projectId?.name || '';
            const bName = b?.projectId?.name || '';
            if (!aName && !bName) return 0;
            if (!aName) return 1;
            if (!bName) return -1;
            return aName.localeCompare(bName);
          },
          render: (text, record) => record.projectId?.name || 'N/A'
        },
        { 
          title: 'Date', 
          dataIndex: 'requiredDate',
          sorter: (a, b) => {
            if (!a?.requiredDate && !b?.requiredDate) return 0;
            if (!a?.requiredDate) return 1;
            if (!b?.requiredDate) return -1;
            return new Date(a.requiredDate) - new Date(b.requiredDate);
          },
          render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' 
        },
        { 
          title: 'Priority', 
          dataIndex: 'priority',
          filters: [
            { text: 'Low', value: 'Low' },
            { text: 'Medium', value: 'Medium' },
            { text: 'High', value: 'High' },
            { text: 'Urgent', value: 'Urgent' },
          ],
          onFilter: (value, record) => record.priority === value,
          render: (val) => {
            const colorMap = {
              'Low': 'default',
              'Medium': 'blue',
              'High': 'orange',
              'Urgent': 'red'
            };
            return <Tag color={colorMap[val] || 'default'}>{val}</Tag>;
          }
        },
        { 
          title: 'Status', 
          dataIndex: 'status',
          filters: [
            { text: 'Pending', value: 'Pending' },
            { text: 'Approved', value: 'Approved' },
            { text: 'Rejected', value: 'Rejected' },
            { text: 'Fulfilled', value: 'Fulfilled' },
          ],
          onFilter: (value, record) => record.status === value,
          render: (val) => {
            const colorMap = {
              'Pending': 'orange',
              'Approved': 'green',
              'Rejected': 'red',
              'Fulfilled': 'blue'
            };
            return <Tag color={colorMap[val] || 'default'}>{val}</Tag>;
          }
        },
        { 
          title: 'Items', 
          sorter: (a, b) => {
            const aLen = a?.items?.length || 0;
            const bLen = b?.items?.length || 0;
            return aLen - bLen;
          },
          render: (_, r) => r.items?.length || 0 
        }
    ],
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
      createForm={<IndentRequestForm />}
      updateForm={<IndentRequestForm isUpdateForm={true} />}
    />
  );
}