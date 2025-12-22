import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import { fields } from './config';

export default function Supplier() {
  const entity = 'inventory/supplier';

  const searchConfig = {
    displayLabels: ['name', 'phone'],
    searchFields: 'name,phone,email,gstNumber',
  };

  const deleteModalLabels = ['name', 'phone'];

  const Labels = {
    PANEL_TITLE: 'Suppliers',
    DATATABLE_TITLE: 'Supplier List',
    ADD_NEW_ENTITY: 'Add New Supplier',
    ENTITY_NAME: 'Supplier',
  };

  const tableActions = {
    showEdit: true,
    showDelete: true,
    position: 'right',
  };

  const dataTableColumns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'GST Number', dataIndex: 'gstNumber' },
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
      createForm={<DynamicForm fields={fields} />}
      updateForm={<DynamicForm fields={fields} isUpdateForm={true} />}
      config={config}
    />
  );
}
