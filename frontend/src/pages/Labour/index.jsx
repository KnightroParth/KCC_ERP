// frontend/src/pages/Labour/index.jsx

import React from 'react';
import { Form } from 'antd';
import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import SelectAsync from '@/components/SelectAsync';
import LockedProjectInput from '@/components/LockedProjectInput';
import useLanguage from '@/locale/useLanguage';
import { fields } from './config';
import { useSelector } from 'react-redux';
import { selectUpdatedItem } from '@/redux/crud/selectors';
import { selectCurrentProject, selectShouldLockProject } from '@/redux/erp/selectors';

function ProjectSelect({ value, onChange, ...props }) {
  return (
    <SelectAsync
      entity="project"
      displayLabels={['name', 'projectCode']}
      outputValue="_id"
      placeholder="Select Project"
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}

function LabourForm({ fields: fieldConfig, isUpdateForm = false }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const { current } = useSelector(selectUpdatedItem);
  const currentProject = useSelector(selectCurrentProject);
  const shouldLockProject = useSelector(selectShouldLockProject);

  React.useEffect(() => {
    if (isUpdateForm && current) {
      const updates = {};
      if (current.projectId) {
        updates.projectId = typeof current.projectId === 'object' ? current.projectId._id : current.projectId;
      }
      if (Object.keys(updates).length > 0) {
        form.setFieldsValue(updates);
      }
    } else if (!isUpdateForm && shouldLockProject && currentProject) {
      form.setFieldsValue({ projectId: currentProject._id });
    }
  }, [current, isUpdateForm, currentProject, shouldLockProject, form]);

  return (
    <>
      <Form.Item
        label={translate('Project')}
        name="projectId"
        rules={[{ required: true, message: 'Please select a project' }]}
        initialValue={shouldLockProject && currentProject ? currentProject._id : undefined}
      >
        {shouldLockProject && currentProject ? <LockedProjectInput /> : <ProjectSelect />}
      </Form.Item>

      <DynamicForm fields={fieldConfig} isUpdateForm={isUpdateForm} />
    </>
  );
}

export default function Labour() {
  const entity = 'labour';

  const searchConfig = {
    displayLabels: ['name', 'phone'],
    searchFields: 'name,phone',
  };

  const deleteModalLabels = ['name', 'trade'];

  const Labels = {
    PANEL_TITLE: 'Manage Company Labour',
    DATATABLE_TITLE: 'Company Labour List',
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
      title: 'Labour Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      filters: [
        { text: 'Skilled', value: 'Skilled' },
        { text: 'Unskilled', value: 'Unskilled' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
    },
    {
      title: 'Wages',
      dataIndex: 'wages',
      key: 'wages',
      render: (val) => val || 0,
    },
    {
      title: 'Mobile Number',
      dataIndex: 'phone',
      key: 'phone',
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
