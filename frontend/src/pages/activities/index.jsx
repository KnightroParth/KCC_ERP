// frontend/src/pages/activities/index.jsx

import React from 'react';
import { Form } from 'antd';
import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import SelectAsync from '@/components/SelectAsync';
import SelectAsyncByProject from '@/components/SelectAsyncByProject';
import useLanguage from '@/locale/useLanguage';
import { fields } from './config';

// Custom SelectAsync wrapper that captures both _id and projectCode
function ProjectSelectWithId({ value, onChange, form, ...props }) {
  const [projects, setProjects] = React.useState([]);
  
  // Fetch projects
  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { request } = await import('@/request');
        const response = await request.list({ entity: 'project' });
        if (response?.result) {
          setProjects(response.result);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    fetchProjects();
  }, []);
  
  const handleChange = (projectCode) => {
    // Find the project by projectCode to get its _id
    const selectedProject = projects.find(p => p.projectCode === projectCode);
    if (selectedProject && form) {
      // Store the _id in projectId field for backend
      form.setFieldValue('projectId', selectedProject._id);
    }
    onChange?.(projectCode);
  };
  
  return (
    <SelectAsync
      entity="project"
      displayLabels={['name', 'projectCode']}
      outputValue="projectCode"
      placeholder="Select Project"
      onChange={handleChange}
      value={value}
      {...props}
    />
  );
}

// Custom form wrapper to handle projectCode and projectId
function ActivitiesForm({ fields: fieldConfig, isUpdateForm = false, ...formProps }) {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  
  return (
    <>
      {/* Hidden field for projectId (_id) - for backend submission */}
      <Form.Item name="projectId" hidden>
        <input type="hidden" />
      </Form.Item>

      {/* Project Selection - stores projectCode */}
      <Form.Item
        label={translate('Project')}
        name="projectCode"
        rules={[{ required: true, message: 'Please select a project' }]}
      >
        <ProjectSelectWithId form={form} />
      </Form.Item>

      {/* Unit Selection - depends on projectCode */}
      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.projectCode !== curr.projectCode}>
        {({ getFieldValue }) => {
          const projectCode = getFieldValue('projectCode');
          return (
            <Form.Item
              label={translate('Unit')}
              name="unitId"
              rules={[{ required: true, message: 'Please select a unit' }]}
            >
              <SelectAsyncByProject
                projectCode={projectCode}
                placeholder="Select Unit"
              />
            </Form.Item>
          );
        }}
      </Form.Item>

      {/* Render remaining fields using DynamicForm */}
      <DynamicForm fields={fieldConfig} isUpdateForm={isUpdateForm} />
    </>
  );
}

export default function Activities() {
  // IMPORTANT: use "activities" (matches backend entity name)
  const entity = 'activities';

  const searchConfig = {
    displayLabels: ['activityCode', 'activityName'],
    searchFields: 'activityCode,activityName,category',
  };

  const deleteModalLabels = ['activityCode', 'activityName'];

  const Labels = {
    PANEL_TITLE: 'Activities',
    DATATABLE_TITLE: 'Activities List',
    ADD_NEW_ENTITY: 'Add New Activity',
    ENTITY_NAME: 'Activity',
  };

  // 🔥 REQUIRED for showing Edit + Delete buttons in list
  const tableActions = {
    showEdit: true,
    showDelete: true,
    position: 'right',
  };

  // Custom dataTableColumns to display Project and Unit
  const dataTableColumns = [
    {
      title: 'Project',
      dataIndex: ['projectId', 'name'],
      key: 'project',
      render: (text, record) => {
        return record?.projectId?.name || record?.projectId?.projectCode || '-';
      },
    },
    {
      title: 'Unit',
      dataIndex: ['unitId', 'unitNumber'],
      key: 'unit',
      render: (text, record) => {
        const unitNumber = record?.unitId?.unitNumber || '-';
        const towerOrWing = record?.unitId?.towerOrWing;
        return towerOrWing ? `${unitNumber} - ${towerOrWing}` : unitNumber;
      },
    },
    {
      title: 'Activity Code',
      dataIndex: 'activityCode',
      key: 'activityCode',
    },
    {
      title: 'Activity Name',
      dataIndex: 'activityName',
      key: 'activityName',
    },
    {
      title: 'Unit of Measurement',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: 'Default Rate',
      dataIndex: 'defaultRate',
      key: 'defaultRate',
      render: (text) => (text ? `₹${text.toLocaleString()}` : '-'),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text) => text || '-',
    },
  ];

  // Remove projectCode and unitId from fields for DynamicForm rendering
  const { projectCode: _pc, unitId: _uid, ...remainingFields } = fields;

  const config = {
    entity,
    ...Labels,
    fields,
    searchConfig,
    deleteModalLabels,
    tableActions,   // 👈 enables Edit + Delete after refresh
    dataTableColumns, // 👈 custom columns with Project and Unit
  };

  return (
    <CrudModule
      createForm={<ActivitiesForm fields={remainingFields} />}
      updateForm={<ActivitiesForm fields={remainingFields} isUpdateForm={true} />}
      config={config}
    />
  );
}
