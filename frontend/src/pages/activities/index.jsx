// frontend/src/pages/activities/index.jsx

import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import { fields } from './config';

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

  const config = {
    entity,
    ...Labels,
    fields,
    searchConfig,
    deleteModalLabels,
    tableActions,   // 👈 enables Edit + Delete after refresh
  };

  return (
    <CrudModule
      createForm={<DynamicForm fields={fields} />}
      updateForm={<DynamicForm fields={fields} isUpdateForm={true} />}
      config={config}
    />
  );
}
