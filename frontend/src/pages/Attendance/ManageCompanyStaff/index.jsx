import React from 'react';
import CrudModule from '@/modules/CrudModule/CrudModule';
import StaffForm from './StaffForm';

export default function ManageCompanyStaff() {
  const entity = 'staff';

  const searchConfig = {
    displayLabels: ['name', 'email'],
    searchFields: 'name,email,mobile,designation',
  };

  const deleteModalLabels = ['name', 'email'];

  const config = {
    entity,
    PANEL_TITLE: 'Manage Company Staff',
    DATATABLE_TITLE: 'Company Staff List',
    ADD_NEW_ENTITY: 'Add New Staff',
    ENTITY_NAME: 'Staff',
    searchConfig,
    deleteModalLabels,
    tableActions: {
      showEdit: true,
      showDelete: true,
      position: 'right',
    },
    dataTableColumns: [
      {
        title: 'Full Name',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: 'Designation',
        dataIndex: 'designation',
        key: 'designation',
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
      },
      {
        title: 'Mobile',
        dataIndex: 'mobile',
        key: 'mobile',
      },
      {
        title: 'Project Allocation',
        key: 'assignedProjects',
        render: (_, record) => {
          const projects = record.assignedProjects;
          if (!projects || projects.length === 0) return '-';
          const list = projects.map((p) => (typeof p === 'object' && p?.projectCode ? `${p.name || p.projectCode} (${p.projectCode})` : p?.name || '-'));
          return list.join(', ') || '-';
        },
      },
      {
        title: 'Status',
        key: 'status',
        render: (_, record) => (record.enabled ? 'Active' : 'Inactive'),
        filters: [
          { text: 'Active', value: 'Active' },
          { text: 'Inactive', value: 'Inactive' },
        ],
        onFilter: (value, record) => (value === 'Active' ? record.enabled === true : record.enabled === false),
      },
    ],
    fields: {
      name: { label: 'Full Name', dataIndex: ['name'] },
      designation: { label: 'Designation', dataIndex: ['designation'] },
      email: { label: 'Email', dataIndex: ['email'] },
      mobile: { label: 'Mobile', dataIndex: ['mobile'] },
      enabled: { label: 'Status', dataIndex: ['enabled'] },
    },
  };

  return (
    <CrudModule
      createForm={<StaffForm />}
      updateForm={<StaffForm isUpdateForm />}
      config={config}
    />
  );
}
