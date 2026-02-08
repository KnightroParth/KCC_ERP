import { useState, useEffect } from 'react';
import { Form, Button, message } from 'antd';

import { useSelector, useDispatch } from 'react-redux';
import { erp } from '@/redux/erp/actions';
import { selectRecordPaymentItem } from '@/redux/erp/selectors';
import useLanguage from '@/locale/useLanguage';

import Loading from '@/components/Loading';

import PaymentForm from '@/forms/PaymentForm';
import { useNavigate } from 'react-router-dom';
import calculate from '@/utils/calculate';

export default function RecordPayment({ config }) {
  const navigate = useNavigate();
  const translate = useLanguage();
  let { entity } = config;

  const dispatch = useDispatch();

  const { isLoading, isSuccess, current: currentInvoice } = useSelector(selectRecordPaymentItem);

  const [form] = Form.useForm();

  const [maxAmount, setMaxAmount] = useState(0);
  useEffect(() => {
    if (currentInvoice) {
      const credit = currentInvoice.credit ?? 0;
      const total = currentInvoice.total ?? 0;
      const discount = currentInvoice.discount ?? 0;
      setMaxAmount(Math.max(0, calculate.sub(calculate.sub(total, discount), credit)));
    }
  }, [currentInvoice]);
  useEffect(() => {
    if (isSuccess) {
      form.resetFields();
      dispatch(erp.resetAction({ actionType: 'recordPayment' }));
      dispatch(erp.list({ entity }));
      navigate(`/${entity}/`);
    }
  }, [isSuccess]);

  const onSubmit = (fieldsValue) => {
    if (!currentInvoice) return;
    const toId = (v) => (v && typeof v === 'object' && v._id ? v._id : v);
    const contractorId = toId(currentInvoice.sourceContractorId);
    if (!contractorId) {
      message.error(translate('Invoice has no contractor; cannot record payment.'));
      return;
    }
    const dateVal = fieldsValue.date;
    const dateStr =
      dateVal && typeof dateVal.toISOString === 'function'
        ? dateVal.toISOString()
        : dateVal && dateVal.$d
          ? new Date(dateVal.$d).toISOString()
          : new Date().toISOString();

    const payload = {
      invoice: currentInvoice._id,
      contractor: contractorId,
      number: fieldsValue.number ?? 1,
      amount: Number(fieldsValue.amount),
      date: dateStr,
      currency: (currentInvoice.currency ?? 'INR').toString().toUpperCase(),
      ref: fieldsValue.ref || undefined,
      description: fieldsValue.description || undefined,
    };
    const paymentModeId = fieldsValue.paymentMode ? toId(fieldsValue.paymentMode) : null;
    if (paymentModeId) payload.paymentMode = paymentModeId;

    dispatch(
      erp.recordPayment({
        entity: 'payment',
        jsonData: payload,
      })
    );
  };

  return (
    <Loading isLoading={isLoading}>
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <PaymentForm maxAmount={maxAmount} />
        <Form.Item>
          <Button type="primary" htmlType="submit">
            {translate('Record Payment')}
          </Button>
        </Form.Item>
      </Form>
    </Loading>
  );
}
