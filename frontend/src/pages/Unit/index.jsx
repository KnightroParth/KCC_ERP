// frontend/src/pages/Unit/index.jsx

import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import { fields } from './config';

export default function Unit() {
  // IMPORTANT: use "unit" (matches backend model name Unit)
  const entity = 'unit';

  const searchConfig = {
    displayLabels: ['unitNumber', 'buildingName'],
    searchFields: 'unitNumber,buildingName,floorNumber,unitType',
  };

  const deleteModalLabels = ['unitNumber', 'buildingName'];

  const Labels = {
    PANEL_TITLE: 'Units',
    DATATABLE_TITLE: 'Units List',
    ADD_NEW_ENTITY: 'Add New Unit',
    ENTITY_NAME: 'Unit',
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

