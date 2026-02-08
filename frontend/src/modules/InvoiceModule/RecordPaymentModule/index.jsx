import { ErpLayout } from '@/layout';

import PageLoader from '@/components/PageLoader';
import { erp } from '@/redux/erp/actions';
import { selectItemById, selectCurrentItem, selectRecordPaymentItem } from '@/redux/erp/selectors';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Payment from './components/Payment';

export default function RecordPaymentModule({ config }) {
  const dispatch = useDispatch();
  const { id } = useParams();

  const listItem = useSelector(selectItemById(id));
  const { result: currentResult } = useSelector(selectCurrentItem);
  const item = currentResult?._id === id ? currentResult : listItem?._id === id ? listItem : currentResult;

  useEffect(() => {
    if (listItem && listItem._id === id) {
      dispatch(erp.currentItem({ data: listItem }));
    } else if (!currentResult || currentResult._id !== id) {
      dispatch(erp.read({ entity: config.entity, id }));
    }
  }, [id, listItem?._id]);

  useEffect(() => {
    const invoice = currentResult?._id === id ? currentResult : listItem?._id === id ? listItem : null;
    if (invoice) {
      dispatch(erp.currentAction({ actionType: 'recordPayment', data: invoice }));
    }
  }, [id, currentResult, listItem]);

  const showPayment = item && item._id === id;

  return (
    <ErpLayout>
      {showPayment ? <Payment config={config} currentItem={item} /> : <PageLoader />}
    </ErpLayout>
  );
}
