import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import { fields } from './config';

export default function Customer() {
  const entity = 'client'; // ✅ backend model is Client

  const searchConfig = {
    displayLabels: ['name'], // ✅ FIXED
    searchFields: 'name',    // ✅ FIXED
    outputValue: 'name',     // ✅ Added safety
  };

  const deleteModalLabels = ['name']; // ✅ FIXED

  const Labels = {
    PANEL_TITLE: "Projects",
    DATATABLE_TITLE: "Project List",
    ADD_NEW_ENTITY: "Add New Project",
    ENTITY_NAME: "Project",
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
