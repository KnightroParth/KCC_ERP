import dayjs from 'dayjs';
import useLanguage from '@/locale/useLanguage';
import { useMoney, useDate } from '@/settings';
import InvoiceDataTableModule from '@/modules/InvoiceModule/InvoiceDataTableModule';

export default function Invoice() {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();

  const dataTableColumns = [
    { title: translate('Number'), dataIndex: 'number' },
    { title: translate('Client'), dataIndex: ['client', 'name'] },
    {
      title: translate('Date'),
      dataIndex: 'date',
      render: (date) => dayjs(date).format(dateFormat),
    },
    {
      title: translate('Expired Date'),
      dataIndex: 'expiredDate',
      render: (date) => dayjs(date).format(dateFormat),
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
    { title: translate('Status'), dataIndex: 'status' },
    { title: translate('Payment'), dataIndex: 'paymentStatus' },
  ];

  const config = {
    entity: 'invoice',
    PANEL_TITLE: translate('invoice'),
    DATATABLE_TITLE: translate('invoice_list'),
    ADD_NEW_ENTITY: translate('add_new_invoice'),
    ENTITY_NAME: translate('invoice'),
    RECORD_ENTITY: translate('record_payment'),
    dataTableColumns,
    searchConfig: {
      entity: 'client',
      displayLabels: ['name'],
      searchFields: 'name',
    },
    deleteModalLabels: ['number', 'client.name'],
  };

  return <InvoiceDataTableModule config={config} />; // ✅ ONLY THIS
}
