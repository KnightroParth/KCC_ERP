import NotFound from '@/components/NotFound';
import { ErpLayout } from '@/layout';
import ReadItem from '@/modules/ErpPanelModule/ReadItem';
import BillingWorkflowStrip from '@/modules/InvoiceModule/BillingWorkflowStrip';

import PageLoader from '@/components/PageLoader';
import { erp } from '@/redux/erp/actions';
import { selectReadItem } from '@/redux/erp/selectors';
import { useLayoutEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useParams } from 'react-router-dom';

export default function ReadInvoiceModule({ config }) {
  const dispatch = useDispatch();
  const { id } = useParams();

  const refresh = () => {
    dispatch(erp.read({ entity: config.entity, id }));
  };

  useLayoutEffect(() => {
    dispatch(erp.read({ entity: config.entity, id }));
  }, [id]);

  const { result: currentResult, isSuccess, isLoading = true } = useSelector(selectReadItem);

  if (isLoading) {
    return (
      <ErpLayout>
        <PageLoader />
      </ErpLayout>
    );
  }
  return (
    <ErpLayout>
      {isSuccess ? (
        <>
          <BillingWorkflowStrip invoice={currentResult} onRefresh={refresh} />
          <ReadItem config={config} selectedItem={currentResult} />
        </>
      ) : (
        <NotFound entity={config.entity} />
      )}
    </ErpLayout>
  );
}
