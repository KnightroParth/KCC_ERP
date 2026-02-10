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
    displayLabels: ['name', 'trade'],
    searchFields: 'name,trade',
  };

  const deleteModalLabels = ['name', 'trade'];

  const Labels = {
    PANEL_TITLE: 'Manage Staff',
    DATATABLE_TITLE: 'Staff List',
    ADD_NEW_ENTITY: 'Add New Staff',
    ENTITY_NAME: 'Staff',
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
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      filters: [
        { text: 'Contractors', value: 'Contractors' },
        { text: 'Labours', value: 'Labours' },
        { text: 'Supervisors', value: 'Supervisors' },
        { text: 'Site Incharge', value: 'Site Incharge' },
      ],
      onFilter: (value, record) => record.type === value,
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
