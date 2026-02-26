import React, { useState, useEffect } from 'react';
import { Card, Button, Form, message, Space } from 'antd';
import { CreditCardOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import request from '@/request/request';
import { erp } from '@/redux/erp/actions';
import { selectRecordPaymentItem } from '@/redux/erp/selectors';
import PaymentForm from '@/forms/PaymentForm';
import calculate from '@/utils/calculate';

/**
 * Step 5: Ledger — Record payment against the approved bill (reuses InvoiceRecordPayment logic).
 * Can work with invoice passed as prop (in-flow) or from Redux after dispatch.
 */
export default function LedgerStep({ invoice, projectName, contractorName: contractorNameProp, onPaymentRecorded }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [maxAmount, setMaxAmount] = useState(0);

  const { isLoading, isSuccess } = useSelector(selectRecordPaymentItem);
  const displayInvoice = invoice;

  useEffect(() => {
    if (displayInvoice) {
      const grossTotal = displayInvoice.items?.reduce((s, i) => s + (Number(i.total) || 0), 0) ?? 0;
      const adj = displayInvoice.adjustments || {};
      const deductions = (Number(adj.advanceDeduction) || 0) + (Number(adj.penalty) || 0) + (Number(adj.holdAmount) || 0);
      const netPayable = Math.max(0, grossTotal - deductions);
      const total = displayInvoice.total ?? netPayable;
      const credit = displayInvoice.credit ?? 0;
      const discount = displayInvoice.discount ?? 0;
      const max = total != null ? calculate.sub(calculate.sub(total, discount), credit) : netPayable - credit;
      setMaxAmount(Math.max(0, max));
    }
  }, [displayInvoice]);

  useEffect(() => {
    if (isSuccess) {
      form.resetFields();
      dispatch(erp.resetAction({ actionType: 'recordPayment' }));
      message.success('Payment recorded.');
      onPaymentRecorded?.();
    }
  }, [isSuccess]);

  const handleSubmit = (fieldsValue) => {
    if (!displayInvoice?._id) return;
    const toId = (v) => (v && typeof v === 'object' && v._id ? v._id : v);
    const contractorId = toId(displayInvoice.sourceContractorId);
    if (!contractorId) {
      message.error('Invoice has no contractor; cannot record payment.');
      return;
    }
    const dateVal = fieldsValue.date;
    const dateStr =
      dateVal?.toISOString?.() ||
      (dateVal?.$d ? new Date(dateVal.$d).toISOString() : new Date().toISOString());
    const payload = {
      invoice: displayInvoice._id,
      contractor: contractorId,
      number: fieldsValue.number ?? 1,
      amount: Number(fieldsValue.amount),
      date: dateStr,
      currency: (displayInvoice.currency ?? 'INR').toString().toUpperCase(),
      ref: fieldsValue.ref || undefined,
      description: fieldsValue.description || undefined,
    };
    const paymentModeId = fieldsValue.paymentMode ? toId(fieldsValue.paymentMode) : null;
    if (paymentModeId) payload.paymentMode = paymentModeId;
    dispatch(erp.recordPayment({ entity: 'payment', jsonData: payload }));
  };

  const contractorName =
    contractorNameProp ||
    displayInvoice?.sourceContractorId?.name ||
    (typeof displayInvoice?.sourceContractorId === 'object' ? displayInvoice?.sourceContractorId?.name : '-');

  if (!displayInvoice?._id) return null;

  return (
    <>
      <Card size="small" style={{ marginBottom: 24, color: '#333' }} className="billing-ledger-step-card">
        <p style={{ marginBottom: 16, fontWeight: 500 }}>Record payment against this approved bill (posts to ledger).</p>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <PaymentForm maxAmount={maxAmount} />
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<CreditCardOutlined />} loading={isLoading}>
              Record Payment
            </Button>
          </Form.Item>
        </Form>
      </Card>
      <Card size="small" style={{ color: '#333' }}>
        <p style={{ marginBottom: 8, fontWeight: 500 }}>More actions</p>
        <Space wrap size="middle">
          <Button
            icon={<CreditCardOutlined />}
            onClick={() => navigate(`/invoice/pay/${displayInvoice._id}`)}
          >
            Open full Record Payment page
          </Button>
          <Button
            icon={<UnorderedListOutlined />}
            onClick={() => navigate(`/invoice/read/${displayInvoice._id}`)}
          >
            View in All Bills
          </Button>
        </Space>
      </Card>
    </>
  );
}
