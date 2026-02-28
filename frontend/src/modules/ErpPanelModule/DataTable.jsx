import { useEffect, useState } from 'react';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  RedoOutlined,
  PlusOutlined,
  EllipsisOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Dropdown, Table, Button, message } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';

import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';
import { selectListItems } from '@/redux/erp/selectors';
import { useErpContext } from '@/context/erp';
import { generate as uniqueId } from 'shortid';
import { useNavigate } from 'react-router-dom';
import { hasPermission, ENTITY_TO_MODULE } from '@/config/roles';

import { DOWNLOAD_BASE_URL } from '@/config/serverApiConfig';
import request from '@/request/request';
import { downloadBillPDF } from '@/pages/Billing/utils/pdfGenerator';
import logoUrl from '@/style/images/logo-text.png';

function AddNewItem({ config }) {
  const navigate = useNavigate();
  const { ADD_NEW_ENTITY, entity } = config;

  const handleClick = () => {
    navigate(`/${entity.toLowerCase()}/create`);
  };

  return (
    <Button onClick={handleClick} type="primary" icon={<PlusOutlined />}>
      {ADD_NEW_ENTITY}
    </Button>
  );
}

export default function DataTable({ config, extra = [] }) {
  const translate = useLanguage();
  const dispatch = useDispatch();
  let { entity, dataTableColumns, disableAdd = false, searchConfig, headerExtra } = config;

  const { DATATABLE_TITLE } = config;

  const { result: listResult, isLoading: listIsLoading } = useSelector(selectListItems);
  const role = useSelector((state) => state?.auth?.current?.role);

  const { pagination, items: dataSource } = listResult;

  const { erpContextAction } = useErpContext();
  const { modal } = erpContextAction;

  const [downloadingId, setDownloadingId] = useState(null);

  const module = ENTITY_TO_MODULE[entity] || entity;
  const canDelete = hasPermission(role, module, 'delete');
  const canEdit = hasPermission(role, module, 'edit');

  const getMenuItems = (record) => {
    const extraItems = typeof extra === 'function' ? extra(record) : Array.isArray(extra) ? extra : [];
    return [
      { label: translate('Show'), key: 'read', icon: <EyeOutlined /> },
      canEdit && { label: translate('Edit'), key: 'edit', icon: <EditOutlined /> },
      { label: translate('Download'), key: 'download', icon: <FilePdfOutlined /> },
      ...(Array.isArray(extraItems) ? extraItems : []),
      { type: 'divider' },
      canDelete && { label: translate('Delete'), key: 'delete', icon: <DeleteOutlined /> },
    ].filter(Boolean);
  };

  const navigate = useNavigate();

  const handleRead = (record) => {
    dispatch(erp.currentItem({ data: record }));
    navigate(`/${entity}/read/${record._id}`);
  };
  const handleEdit = (record) => {
    const data = { ...record };
    dispatch(erp.currentAction({ actionType: 'update', data }));
    navigate(`/${entity}/update/${record._id}`);
  };
  const handleDownload = async (record) => {
    if (entity === 'invoice') {
      setDownloadingId(record._id);
      try {
        const res = await request.read({ entity: 'invoice', id: record._id });
        const inv = res?.result;
        if (!inv) {
          message.error('Could not load invoice');
          return;
        }
        const projectName = inv.sourceProjectId?.name ?? 'Project';
        const contractorName = inv.sourceContractorId?.name ?? inv.client?.name ?? '';
        let logoBase64 = '';
        let logoSize = null;
        try {
          const r = await fetch(logoUrl);
          const blob = await r.blob();
          logoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          logoSize = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => resolve(null);
            img.src = logoBase64;
          });
        } catch (_) {}
        downloadBillPDF(
          inv,
          projectName,
          `KCC-Bill-${inv.number ?? 'draft'}.pdf`,
          contractorName,
          logoBase64,
          logoSize,
        );
      } catch (e) {
        message.error(e?.message || 'Failed to generate PDF');
      } finally {
        setDownloadingId(null);
      }
    } else {
      window.open(`${DOWNLOAD_BASE_URL}${entity}/${entity}-${record._id}.pdf`, '_blank');
    }
  };

  const handleDelete = (record) => {
    dispatch(erp.currentAction({ actionType: 'delete', data: record }));
    modal.open();
  };

  const handleRecordPayment = (record) => {
    dispatch(erp.currentItem({ data: record }));
    navigate(`/invoice/pay/${record._id}`);
  };

  const handleResumeBill = (record) => {
    navigate(`/billing/planning?resume=${record._id}`);
  };

  dataTableColumns = [
    ...dataTableColumns,
    {
      title: translate('Actions'),
      key: 'action',
      fixed: 'right',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Dropdown
          overlayClassName="erp-actions-dropdown-overlay"
          menu={{
            items: getMenuItems(record),
            onClick: ({ key }) => {
              switch (key) {
                case 'read':
                  handleRead(record);
                  break;
                case 'edit':
                  handleEdit(record);
                  break;
                case 'download':
                  handleDownload(record);
                  break;
                case 'delete':
                  handleDelete(record);
                  break;
                case 'recordPayment':
                  handleRecordPayment(record);
                  break;
                case 'resume':
                  handleResumeBill(record);
                  break;
                default:
                  break;
              }
            },
            style: { minWidth: 140 },
            className: 'erp-actions-dropdown-menu',
          }}
          trigger={['click']}
        >
          <Button
            type="text"
            className="erp-actions-trigger-btn"
            icon={<EllipsisOutlined style={{ fontSize: 20 }} />}
            onClick={(e) => e.preventDefault()}
          />
        </Dropdown>
      ),
    },
  ];

  const handelDataTableLoad = (pagination) => {
    const options = { page: pagination.current || 1, items: pagination.pageSize || 10 };
    dispatch(erp.list({ entity, options }));
  };

  const dispatcher = () => {
    dispatch(erp.list({ entity }));
  };

  useEffect(() => {
    const controller = new AbortController();
    dispatcher();
    return () => {
      controller.abort();
    };
  }, []);

  const filterTable = (value) => {
    const filterField = searchConfig?.filterField || searchConfig?.entity;
    const options = { equal: value, filter: filterField };
    dispatch(erp.list({ entity, options }));
  };

  return (
    <>
      <PageHeader
        title={DATATABLE_TITLE}
        ghost={true}
        onBack={() => window.history.back()}
        backIcon={<ArrowLeftOutlined />}
        extra={[
          <AutoCompleteAsync
            key={`${uniqueId()}`}
            entity={searchConfig?.entity}
            displayLabels={['name']}
            searchFields={'name'}
            onChange={filterTable}
          />,
          <Button onClick={handelDataTableLoad} key={`${uniqueId()}`} icon={<RedoOutlined />}>
            {translate('Refresh')}
          </Button>,
          ...(Array.isArray(headerExtra) ? headerExtra : []),
          !disableAdd && !headerExtra && <AddNewItem config={config} key={`${uniqueId()}`} />,
          !disableAdd && headerExtra && null,
        ].filter(Boolean)}
        style={{
          padding: '20px 0px',
        }}
      ></PageHeader>

      <Table
        columns={dataTableColumns}
        rowKey={(item) => item._id}
        dataSource={dataSource}
        pagination={pagination}
        loading={listIsLoading}
        onChange={handelDataTableLoad}
        scroll={{ x: 'max-content' }}
      />
    </>
  );
}
