// frontend/src/pages/Vendor/index.jsx

import React from 'react';
import CrudModule from '@/modules/CrudModule/CrudModule';
import VendorForm from './VendorForm';
import { fields } from './config';

export default function Vendor() {
  const entity = 'vendor';

  const Labels = {
    PANEL_TITLE: 'Vendors',
    DATATABLE_TITLE: 'Vendor List',
    ADD_NEW_ENTITY: 'Add New Vendor',
    ENTITY_NAME: 'Vendor',
  };

  const searchConfig = {
    displayLabels: ['name', 'phone'],
    searchFields: 'name,phone,email',
  };

  const deleteModalLabels = ['name', 'phone'];

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
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || '-',
    },
    {
      title: 'Total Labour Capacity',
      key: 'totalCapacity',
      render: (_, record) => {
        if (!record.labourSupplyDetails || record.labourSupplyDetails.length === 0) {
          return '0';
        }
        const total = record.labourSupplyDetails.reduce((sum, item) => {
          return sum + (item.count || 0);
        }, 0);
        return total.toString();
      },
    },
    {
      title: 'Labour Capacity',
      key: 'labourCapacity',
      render: (_, record) => {
        if (!record.labourSupplyDetails || record.labourSupplyDetails.length === 0) {
          return <span style={{ color: '#999' }}>No capacity defined</span>;
        }
        return (
          <div>
            {record.labourSupplyDetails.map((item, index) => (
              <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                {item.labourType || 'N/A'}: {item.count || 0}
              </Tag>
            ))}
          </div>
        );
      },
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
      createForm={<VendorForm />}
      updateForm={<VendorForm isUpdateForm={true} />}
      config={config}
    />
  );
}
