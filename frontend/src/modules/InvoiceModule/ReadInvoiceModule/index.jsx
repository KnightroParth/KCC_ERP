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

  const { result: currentResult, isSuccess, isLoading } = useSelector(selectReadItem);

  const loading = isLoading === true || (id && currentResult == null && !isSuccess);

  if (loading) {
    return (
      <ErpLayout>
        <PageLoader />
      </ErpLayout>
    );
  }
  if (isSuccess && currentResult) {
    return (
      <ErpLayout>
        <div style={{ padding: '0 24px 0', maxWidth: 1200, margin: '0 auto' }}>
          <BillingWorkflowStrip invoice={currentResult} onRefresh={refresh} />
        </div>
        <ReadItem config={config} selectedItem={currentResult} />
      </ErpLayout>
    );
  }
  return (
    <ErpLayout>
      <NotFound entity={config.entity} />
    </ErpLayout>
  );
}
