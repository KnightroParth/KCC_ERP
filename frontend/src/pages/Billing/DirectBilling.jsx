import React from 'react';
import useLanguage from '@/locale/useLanguage';
import CreateInvoiceModule from '@/modules/InvoiceModule/CreateInvoiceModule';

export default function DirectBilling() {
  const translate = useLanguage();
  const entity = 'invoice';
  const configPage = {
    entity,
    PANEL_TITLE: 'Direct Invoice',
    DATATABLE_TITLE: translate('invoice_list'),
    ADD_NEW_ENTITY: translate('add_new_invoice'),
    ENTITY_NAME: translate('invoice'),
    RECORD_ENTITY: translate('record_payment'),
  };

  return <CreateInvoiceModule config={configPage} />;
}
