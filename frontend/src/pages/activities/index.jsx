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
      createForm={<DynamicForm fields={fields} />}
      updateForm={<DynamicForm fields={fields} isUpdateForm={true} />}
      config={config}
    />
  );
}
