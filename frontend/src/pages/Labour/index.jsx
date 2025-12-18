// frontend/src/pages/Labour/index.jsx

import React from 'react';
import { Form } from 'antd';
import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import SelectAsync from '@/components/SelectAsync';
import useLanguage from '@/locale/useLanguage';
import { fields } from './config';
import { useSelector } from 'react-redux';
import { selectUpdatedItem } from '@/redux/crud/selectors';

function ProjectSelect({ value, onChange, form, ...props }) {
  const [projects, setProjects] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      const { request } = await import('@/request');
      const res = await request.listAll({ entity: 'project' });
      if (res?.result) setProjects(res.result);
    })();
  }, []);

  const handleChange = (projectId) => {
    onChange?.(projectId);
  };

  return (
    <SelectAsync
      entity="project"
      displayLabels={['name', 'projectCode']}
      outputValue="_id"
      placeholder="Select Project"
      value={value}
      onChange={handleChange}
      {...props}
    />
  );
}

function LabourForm({ fields: fieldConfig, isUpdateForm = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const { current } = useSelector(selectUpdatedItem);

  React.useEffect(() => {
    if (isUpdateForm && current) {
      const updates = {};
      if (current.projectId) {
        // Extract ID from populated project object or use ID directly
        updates.projectId = typeof current.projectId === 'object' ? current.projectId._id : current.projectId;
      }
      if (Object.keys(updates).length > 0) {
        form.setFieldsValue(updates);
      }
    }
  }, [current, isUpdateForm, form]);

  return (
    <>
      <Form.Item
        label={translate('Project')}
        name="projectId"
        rules={[
          {
            required: true,
            message: 'Please select a project',
          },
        ]}
      >
        <ProjectSelect form={form} />
      </Form.Item>

      <DynamicForm fields={fieldConfig} isUpdateForm={isUpdateForm} />
    </>
  );
}

export default function Labour() {
  const entity = 'labour';

  const searchConfig = {
    displayLabels: ['name', 'trade'],
    searchFields: 'name,trade',
  };

  const deleteModalLabels = ['name', 'trade'];

  const Labels = {
    PANEL_TITLE: 'Labour Master',
    DATATABLE_TITLE: 'Labour List',
    ADD_NEW_ENTITY: 'Add New Labour',
    ENTITY_NAME: 'Labour',
  };

  const tableActions = {
    showEdit: true,
    showDelete: true,
    position: 'right',
  };

  const dataTableColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Trade',
      dataIndex: 'trade',
      key: 'trade',
    },
    {
      title: 'Designation / Labour Type',
      dataIndex: 'labourType',
      key: 'labourType',
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
  ];

  const config = {
    entity,
    ...Labels,
    fields,
    searchConfig,
    deleteModalLabels,
    tableActions,
    dataTableColumns,
  };

  return (
    <CrudModule
      createForm={<LabourForm fields={fields} />}
      updateForm={<LabourForm fields={fields} isUpdateForm />}
      config={config}
    />
  );
}
