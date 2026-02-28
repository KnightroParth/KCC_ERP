import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { Button, Tag } from 'antd';
import { FileTextOutlined, PlusOutlined, CreditCardOutlined, PlayCircleOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { useMoney, useDate } from '@/settings';
import InvoiceDataTableModule from '@/modules/InvoiceModule/InvoiceDataTableModule';
import { getStageLabel, isInProgress } from '@/pages/Billing/utils/billingStage';

export default function Invoice() {
  const navigate = useNavigate();
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();

  const dataTableColumns = [
    { title: translate('Number'), dataIndex: 'number', width: 90 },
    {
      title: 'Contractor',
      key: 'contractor',
      dataIndex: 'contractorDisplayName',
      width: 160,
      ellipsis: true,
      render: (_, record) => record?.contractorDisplayName || record?.sourceContractorId?.name || '-',
    },
    {
      title: 'Bill Type',
      dataIndex: 'billType',
      key: 'billType',
      width: 110,
      render: (v) => (v === 'normal' ? 'From Planning' : v === 'direct' ? 'Direct' : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'billingStage',
      key: 'billingStage',
      width: 130,
      render: (v, record) => {
        const { label, color } = getStageLabel(v, record?.status);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: translate('Date'),
      dataIndex: 'date',
      render: (date) => date ? dayjs(date).format(dateFormat) : '-',
    },
    {
      title: translate('Expired Date'),
      dataIndex: 'expiredDate',
      render: (date) => date ? dayjs(date).format(dateFormat) : '-',
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
      render: (total, record) => moneyFormatter({ amount: total, currency_code: record.currency }),
    },
    {
      title: translate('Paid'),
      dataIndex: 'credit',
      render: (total, record) => moneyFormatter({ amount: total, currency_code: record.currency }),
    },
    {
      title: 'Payment status',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 110,
      render: (v) => (v ? v.replace(/\b\w/g, (c) => c.toUpperCase()) : '-'),
    },
  ];

  const getExtraActions = (record) => {
    const actions = [
      { label: translate('Record Payment'), key: 'recordPayment', icon: <CreditCardOutlined /> },
    ];
    if (isInProgress(record)) {
      actions.unshift({ label: 'Resume', key: 'resume', icon: <PlayCircleOutlined /> });
    }
    return actions;
  };

  const config = {
    entity: 'invoice',
    PANEL_TITLE: 'Bills',
    DATATABLE_TITLE: 'All Bills',
    ADD_NEW_ENTITY: translate('add_new_invoice'),
    ENTITY_NAME: translate('invoice'),
    RECORD_ENTITY: translate('record_payment'),
    dataTableColumns,
    searchConfig: {
      entity: 'vendor',
      displayLabels: ['name'],
      searchFields: 'name',
      filterField: 'sourceContractorId',
    },
    deleteModalLabels: ['number', 'contractorDisplayName'],
    getExtraActions,
    headerExtra: [
      <Button
        key="from-planning"
        onClick={() => navigate('/billing/planning')}
        icon={<FileTextOutlined />}
      >
        Create from Planning
      </Button>,
      <Button
        key="direct"
        type="primary"
        onClick={() => navigate('/invoice/create')}
        icon={<PlusOutlined />}
      >
        Direct Bill
      </Button>,
    ],
  };

  return <InvoiceDataTableModule config={config} />;
}
