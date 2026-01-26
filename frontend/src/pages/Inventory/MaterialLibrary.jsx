// frontend/src/pages/Inventory/MaterialLibrary.jsx

import React, { useState, useEffect } from 'react';
import { Button, Upload, message, Modal, Table, Tag, Space, Tooltip, Input } from 'antd';
import { UploadOutlined, FilePdfOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';
import { request } from '@/request';
import storePersist from '@/redux/storePersist';
import { generateMaterialLibraryPDF } from '@/utils/pdfGenerator';

const { Search } = Input;

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
  additionalSpec: {
    label: 'Additional Specifications',
    type: 'textarea',
    placeholder: 'Additional details',
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
    label: 'Opening Stock',
    type: 'number',
    defaultValue: 0,
  },
};

// Low stock threshold (configurable)
const LOW_STOCK_THRESHOLD = 10;

function MaterialLibrary() {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredCategory, setFilteredCategory] = useState(null);

  // Load materials with current stock data
  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const res = await request.list({ 
        entity: 'inventory/material',
        options: { items: 1000 }
      });
      
      if (res?.success && res?.result) {
        // Fetch current stock for each material across all projects
        const materialsWithStock = await Promise.all(
          res.result.map(async (material) => {
            try {
              // Get total stock across all projects for this material
              const stockRes = await request.list({
                entity: 'inventory/inventory',
                options: { 
                  material: material._id,
                  items: 1000
                }
              });
              
              const totalStock = stockRes?.result?.reduce((sum, inv) => {
                return sum + (inv.currentStock || 0);
              }, 0) || material.openingStock || 0;

              return {
                ...material,
                currentStock: totalStock,
                isLowStock: totalStock < LOW_STOCK_THRESHOLD,
              };
            } catch (e) {
              return {
                ...material,
                currentStock: material.openingStock || 0,
                isLowStock: (material.openingStock || 0) < LOW_STOCK_THRESHOLD,
              };
            }
          })
        );
        
        setMaterials(materialsWithStock);
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      message.error('Failed to load materials: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
        loadMaterials(); // Reload materials
      } else {
        message.error(result.message || 'Import failed');
      }
    } catch (error) {
      message.error('Import failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const filtered = getFilteredMaterials();
      await generateMaterialLibraryPDF(filtered, 'material-library.pdf');
      message.success('PDF exported successfully');
    } catch (error) {
      const errorMessage = error?.message || 'Unknown error';
      message.error('Failed to export PDF: ' + errorMessage);
    }
  };

  const getFilteredMaterials = () => {
    let filtered = [...materials];
    
    if (searchText) {
      filtered = filtered.filter(m => 
        m.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        m.category?.toLowerCase().includes(searchText.toLowerCase()) ||
        m.specifications?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    if (filteredCategory) {
      filtered = filtered.filter(m => m.category === filteredCategory);
    }
    
    return filtered;
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
      return false;
    },
    showUploadList: false,
  };

  // Get unique categories for filter
  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))];

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

  const filteredMaterials = getFilteredMaterials();
  const lowStockCount = filteredMaterials.filter(m => m.isLowStock).length;

  const dataTableColumns = [
    {
      title: 'Material Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => {
        const aName = a?.name || '';
        const bName = b?.name || '';
        if (!aName && !bName) return 0;
        if (!aName) return 1;
        if (!bName) return -1;
        return aName.localeCompare(bName);
      },
      render: (text, record) => (
        <Space>
          {text || '-'}
          {record.isLowStock && (
            <Tooltip title="Low Stock Alert">
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      sorter: (a, b) => {
        const aCat = a?.category || '';
        const bCat = b?.category || '';
        if (!aCat && !bCat) return 0;
        if (!aCat) return 1;
        if (!bCat) return -1;
        return aCat.localeCompare(bCat);
      },
      filters: categories.map(cat => ({ text: cat, value: cat })),
      onFilter: (value, record) => record.category === value,
      render: (text) => text ? <Tag color="blue">{text}</Tag> : '-',
    },
    {
      title: 'Unit',
      dataIndex: 'uom',
      key: 'uom',
      sorter: (a, b) => {
        const aUom = a?.uom || '';
        const bUom = b?.uom || '';
        if (!aUom && !bUom) return 0;
        if (!aUom) return 1;
        if (!bUom) return -1;
        return aUom.localeCompare(bUom);
      },
      render: (text) => text ? <Tag>{text.toUpperCase()}</Tag> : '-',
    },
    {
      title: 'Current Stock',
      dataIndex: 'currentStock',
      key: 'currentStock',
      sorter: (a, b) => {
        const aStock = a?.currentStock || 0;
        const bStock = b?.currentStock || 0;
        return aStock - bStock;
      },
      render: (stock, record) => {
        const stockValue = stock || 0;
        const color = record.isLowStock ? 'red' : stockValue > 0 ? 'green' : 'default';
        return (
          <Tag color={color}>
            {stockValue.toFixed(2)} {record.uom || 'nos'}
          </Tag>
        );
      },
    },
    {
      title: 'Opening Stock',
      dataIndex: 'openingStock',
      key: 'openingStock',
      sorter: (a, b) => {
        const aStock = a?.openingStock || 0;
        const bStock = b?.openingStock || 0;
        return aStock - bStock;
      },
      render: (stock) => (stock || 0).toFixed(2),
    },
    {
      title: 'Specifications',
      dataIndex: 'specifications',
      key: 'specifications',
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip title={text}>
          {text || '-'}
        </Tooltip>
      ),
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
      <Space>
        <Button
          type="primary"
          icon={<FilePdfOutlined />}
          onClick={handleExportPDF}
          disabled={filteredMaterials.length === 0}
        >
          Export PDF
        </Button>
        <Button
          type="default"
          icon={<UploadOutlined />}
          onClick={() => setImportModalVisible(true)}
        >
          Import CSV/Excel
        </Button>
        {lowStockCount > 0 && (
          <Tag color="red" style={{ marginLeft: 8 }}>
            {lowStockCount} Low Stock Items
          </Tag>
        )}
      </Space>
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
          Required columns: Material Name, Category, UOM, In Stock
        </p>
      </Modal>
    </>
  );
}

export default MaterialLibrary;
