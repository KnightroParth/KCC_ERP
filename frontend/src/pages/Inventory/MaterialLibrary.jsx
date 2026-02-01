// frontend/src/pages/Inventory/MaterialLibrary.jsx

import React, { useState } from 'react';
import { Button, Upload, message, Modal, Tag } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import { request } from '@/request';
import storePersist from '@/redux/storePersist';

const fields = {
  name: {
    label: 'Material Name',
    type: 'string',
    required: true,
    placeholder: 'e.g., Cement, Steel Rods',
  },
  specifications: {
    label: 'Specifications',
    type: 'textarea',
    placeholder: 'e.g., Grade 43, 12mm diameter',
  },
  price: {
    label: 'Rate (₹)',
    type: 'number',
    defaultValue: 0,
    placeholder: 'Unit rate',
    render: (val) => {
      const n = Number(val);
      return typeof n === 'number' && !isNaN(n) ? `₹${n.toFixed(2)}` : '—';
    },
  },
  category: {
    label: 'Category',
    type: 'string',
    placeholder: 'e.g., Civil, Electrical, Plumbing',
  },
  uom: {
    label: 'Unit of Measure',
    type: 'string',
    defaultValue: 'nos',
    placeholder: 'e.g., nos, kg, mt, m, sqm',
  },
  openingStock: {
    label: 'Opening Stock / Current Stock',
    type: 'number',
    defaultValue: 0,
    help: 'Initial stock when creating material. This will be updated automatically when stock is received (GRN) or issued.',
  },
};

function MaterialLibrary() {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImport = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const auth = storePersist.get('auth');
      const token = auth?.current?.token;

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_SERVER || 'http://localhost:8888/'}api/inventory/material/import`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = response.data;

      if (result.success) {
        message.success(
          `Import successful! ${result.result.imported} imported, ${result.result.updated} updated`
        );
        setImportModalVisible(false);
        // Refresh the table
        window.location.reload();
      } else {
        message.error(result.message || 'Import failed');
      }
    } catch (error) {
      message.error('Import failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadProps = {
    beforeUpload: (file) => {
      const isExcel =
        file.type === 'application/vnd.ms-excel' ||
        file.type ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'text/csv';
      if (!isExcel) {
        message.error('You can only upload Excel or CSV files!');
        return Upload.LIST_IGNORE;
      }
      handleImport(file);
      return false; // Prevent auto upload
    },
    showUploadList: false,
  };

  const entity = 'inventory/material';
  const searchConfig = {
    displayLabels: ['name', 'category'],
    searchFields: 'name,category,specifications',
  };

  const deleteModalLabels = ['name', 'category'];

  const tableActions = {
    showEdit: true,
    showDelete: true,
    position: 'right',
  };

  const dataTableColumns = [
    {
      title: 'Material Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'UOM',
      dataIndex: 'uom',
      key: 'uom',
    },
    {
      title: 'Rate (₹)',
      dataIndex: 'price',
      key: 'price',
      render: (val) => (val != null ? `₹${Number(val).toFixed(2)}` : '—'),
    },
    {
      title: 'Current Stock',
      dataIndex: 'openingStock',
      key: 'openingStock',
      render: (stock) => {
        const stockValue = parseFloat(stock) || 0;
        const color = stockValue > 0 ? 'green' : 'default';
        return <Tag color={color}>{stockValue.toFixed(2)}</Tag>;
      },
    },
    {
      title: 'Specifications',
      dataIndex: 'specifications',
      key: 'specifications',
      ellipsis: true,
    },
  ];

  const config = {
    entity: 'inventory/material',
    PANEL_TITLE: 'Material Library',
    DATATABLE_TITLE: 'Material List',
    ADD_NEW_ENTITY: 'Add New Material',
    ENTITY_NAME: 'Material',
    fields,
    searchConfig,
    deleteModalLabels,
    tableActions,
    dataTableColumns,
    fixHeaderPanel: (
      <Button
        type="primary"
        icon={<UploadOutlined />}
        onClick={() => setImportModalVisible(true)}
        style={{ marginLeft: 8 }}
      >
        Import CSV/Excel
      </Button>
    ),
  };

  return (
    <>
      <CrudModule
        config={config}
        createForm={<DynamicForm fields={fields} />}
        updateForm={<DynamicForm fields={fields} isUpdateForm={true} />}
      />
      <Modal
        title="Import Materials from Excel/CSV"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={null}
      >
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />} loading={uploading}>
            Select File
          </Button>
        </Upload>
        <p style={{ marginTop: 16, color: '#666' }}>
          Supported formats: .xlsx, .xls, .csv
          <br />
          Required columns: Material Name, Category, UOM, In Stock. Optional: Rate/Price, Specifications
        </p>
      </Modal>
    </>
  );
}

export default MaterialLibrary;
