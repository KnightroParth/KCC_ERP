import { useCallback, useEffect, useState } from 'react';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  RedoOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Table, Button, Input, Space } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import { useSelector, useDispatch } from 'react-redux';
import { crud } from '@/redux/crud/actions';
import { selectListItems } from '@/redux/crud/selectors';
import useLanguage from '@/locale/useLanguage';
import { dataForTable } from '@/utils/dataStructure';
import { useMoney, useDate } from '@/settings';
import { generate as uniqueId } from 'shortid';
import { useCrudContext } from '@/context/crud';

function AddNewItem({ config }) {
  const { crudContextAction } = useCrudContext();
  const { collapsedBox, panel } = crudContextAction;
  const { ADD_NEW_ENTITY } = config;

  const handelClick = () => {
    panel.open();
    collapsedBox.close();
  };

  return (
    <Button onClick={handelClick} type="primary" size="middle" shape="round">
      {ADD_NEW_ENTITY}
    </Button>
  );
}

export default function DataTable({ config, extra = [] }) {
  // --- 1. HOOKS (Moved to Top) ---
  const dispatch = useDispatch();
  const { crudContextAction } = useCrudContext();
  const { panel, collapsedBox, modal, readBox, editBox, advancedBox } = crudContextAction;
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();
  
  // Data Selectors
  const { result: listResult, isLoading: listIsLoading } = useSelector(selectListItems);
  const { pagination, items: dataSource } = listResult;

  let { entity, dataTableColumns, DATATABLE_TITLE, fields, searchConfig } = config;

  // --- 2. HANDLERS ---
  const handleRead = (record) => {
    dispatch(crud.currentItem({ data: record }));
    panel.open();
    collapsedBox.open();
    readBox.open();
  };

  const handleEdit = (record) => {
    dispatch(crud.currentItem({ data: record }));
    dispatch(crud.currentAction({ actionType: 'update', data: record }));
    editBox.open();
    panel.open();
    collapsedBox.open();
  };

  const handleDelete = (record) => {
    dispatch(crud.currentAction({ actionType: 'delete', data: record }));
    modal.open();
  };

  const handleUpdatePassword = (record) => {
    dispatch(crud.currentItem({ data: record }));
    dispatch(crud.currentAction({ actionType: 'update', data: record }));
    advancedBox.open();
    panel.open();
    collapsedBox.open();
  };

  // --- 3. COLUMNS ---
  let dispatchColumns = [];
  if (fields && Object.keys(fields).length > 0) {
    dispatchColumns = [...dataForTable({ fields, translate, moneyFormatter, dateFormat })];
  } else {
    dispatchColumns = [...(dataTableColumns || [])];
  }

  const columns = [
    ...dispatchColumns,
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            size="small"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            size="small"
            danger
            type="primary"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }}
          />
        </Space>
      ),
    },
  ];

  // --- 4. DATA LOADING ---
  const handelDataTableLoad = useCallback((pagination) => {
    const options = { page: pagination.current || 1, items: pagination.pageSize || 10 };
    dispatch(crud.list({ entity, options }));
  }, [dispatch, entity]);

  const filterTable = (e) => {
    const value = e.target.value;
    const options = { q: value, fields: searchConfig?.searchFields || '' };
    dispatch(crud.list({ entity, options }));
  };

  const dispatcher = () => {
    dispatch(crud.list({ entity }));
  };

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    dispatcher();
    setIsReady(true);
    return () => {
      controller.abort();
      dispatch(crud.resetState());
    };
  }, [entity]); // Removed 'dispatch' from dependency to prevent loop, 'entity' is enough

  return (
    <>
      <PageHeader
        onBack={() => window.history.back()}
        backIcon={<ArrowLeftOutlined />}
        title={DATATABLE_TITLE}
        ghost={false}
        extra={[
          <Input
            key={`searchFilterDataTable}`}
            onChange={filterTable}
            placeholder={translate('search')}
            allowClear
            className="datatable-search"
          />,
          <Button
            onClick={handelDataTableLoad}
            key={`${uniqueId()}`}
            icon={<RedoOutlined />}
            shape="round"
          >
            {translate('Refresh')}
          </Button>,
          <AddNewItem key={`${uniqueId()}`} config={config} />,
        ]}
        style={{ padding: '20px 0px' }}
      ></PageHeader>

      <Table
        columns={columns}
        rowKey={(item) => item._id}
        dataSource={isReady ? dataSource : []}
        pagination={pagination}
        loading={listIsLoading}
        onChange={handelDataTableLoad}
        scroll={{ x: 'max-content' }}
      />
    </>
  );
}