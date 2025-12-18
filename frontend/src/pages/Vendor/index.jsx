// frontend/src/pages/Vendor/index.jsx
import React from 'react';
import { Tag } from 'antd'; // <--- THIS WAS MISSING
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
        return record.labourSupplyDetails.reduce((sum, item) => sum + (item.count || 0), 0);
      },
    },
    {
      title: 'Details',
      key: 'labourCapacity',
      render: (_, record) => {
        if (!record.labourSupplyDetails || record.labourSupplyDetails.length === 0) {
          return <span style={{ color: '#999' }}>-</span>;
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {record.labourSupplyDetails.map((item, index) => (
              <Tag key={index} color="blue">
                {item.labourType}: {item.count}
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