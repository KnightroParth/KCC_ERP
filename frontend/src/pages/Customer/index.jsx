import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import { fields } from './config';

export default function Customer() {
  const entity = 'client';

  const searchConfig = {
    displayLabels: ['project_name'],
    searchFields: 'project_name',
  };

  const deleteModalLabels = ['project_name'];

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
