// frontend/src/pages/Customer/index.jsx
// This page = Projects Module

import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import { fields } from './config';

export default function Customer() {
  // IMPORTANT: use "project" (matches backend model name Project)
  const entity = 'project';

  const searchConfig = {
    displayLabels: ['name', 'projectId'],
    searchFields: 'name,projectId,stakeholderName',
  };

  const deleteModalLabels = ['name', 'projectId'];

  const Labels = {
    PANEL_TITLE: 'Projects',
    DATATABLE_TITLE: 'Project List',
    ADD_NEW_ENTITY: 'Add New Project',
    ENTITY_NAME: 'Project',
  };

  const config = {
    entity,
    ...Labels,
    fields,
    searchConfig,
    deleteModalLabels,
  };

  return (
    <CrudModule
      createForm={<DynamicForm fields={fields} />}
      updateForm={<DynamicForm fields={fields} />}
      config={config}
    />
  );
}