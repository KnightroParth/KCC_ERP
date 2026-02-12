import { useState, useEffect } from 'react';
import { Button, Row, Col, Descriptions, Statistic, Card, Table } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import {
  EditOutlined,
  FilePdfOutlined,
  CloseCircleOutlined,
  RetweetOutlined,
  MailOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';

import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';

import { selectCurrentItem } from '@/redux/erp/selectors';

import { DOWNLOAD_BASE_URL } from '@/config/serverApiConfig';
import { useMoney } from '@/settings';
import useMail from '@/hooks/useMail';
import { useNavigate } from 'react-router-dom';
import { downloadBillPDF } from '@/pages/Billing/utils/pdfGenerator';
import logoUrl from '@/style/images/logo-text.png';

export default function ReadItem({ config, selectedItem }) {
  const translate = useLanguage();
  const { entity, ENTITY_NAME } = config;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { moneyFormatter } = useMoney();
  const { send, isLoading: mailInProgress } = useMail({ entity });

  const { result: currentResult } = useSelector(selectCurrentItem);

  const resetErp = {
    status: '',
    client: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    subTotal: 0,
    taxTotal: 0,
    taxRate: 0,
    total: 0,
    credit: 0,
    number: 0,
    year: 0,
    currency: 'INR',
  };

  const [itemslist, setItemsList] = useState([]);
  const [currentErp, setCurrentErp] = useState(selectedItem ?? resetErp);
  const [client, setClient] = useState({});
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const currency = currentErp?.currency ?? 'INR';

  useEffect(() => {
    if (currentResult) {
      const { items, invoice, ...others } = currentResult;

      if (items && Array.isArray(items)) {
        setItemsList(items);
        setCurrentErp(currentResult);
      } else if (invoice?.items && Array.isArray(invoice.items)) {
        setItemsList(invoice.items);
        setCurrentErp({ ...invoice, ...others, items: invoice.items });
      } else {
        setCurrentErp(currentResult);
        setItemsList(currentResult?.items || []);
      }
    }
    return () => {
      setItemsList([]);
      setCurrentErp(resetErp);
    };
  }, [currentResult]);

  // Prefer contractor (sourceContractorId) for display; fallback to client
  useEffect(() => {
    if (currentErp?.sourceContractorId && typeof currentErp.sourceContractorId === 'object') {
      setClient(currentErp.sourceContractorId);
    } else if (currentErp?.client) {
      setClient(currentErp.client);
    } else {
      setClient({});
    }
  }, [currentErp]);

  return (
    <div className="invoice-read-body" style={{ padding: '0 24px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        onBack={() => {
          navigate(`/${entity.toLowerCase()}`);
        }}
        title={`${ENTITY_NAME} # ${currentErp.number}/${currentErp.year || ''}`}
        ghost={false}
        tags={[
          entity === 'invoice' && currentErp.billingStage && (
            <span key="stage" style={{ marginRight: 8 }}>
              Stage: {String(currentErp.billingStage).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          ),
          entity === 'invoice' && currentErp.paymentStatus && (
            <span key="paymentStatus">Payment: {String(currentErp.paymentStatus).replace(/\b\w/g, (c) => c.toUpperCase())}</span>
          ),
          entity !== 'invoice' && currentErp.status && (
            <span key="status" style={{ marginRight: 8 }}>{translate(currentErp.status)}</span>
          ),
          entity !== 'invoice' && currentErp.paymentStatus && (
            <span key="paymentStatus">{translate(currentErp.paymentStatus)}</span>
          ),
        ].filter(Boolean)}
        extra={[
          <Button
            key="close"
            onClick={() => navigate(`/${entity.toLowerCase()}`)}
            icon={<CloseCircleOutlined />}
          >
            {translate('Close')}
          </Button>,
          ...(entity === 'invoice'
            ? [
                <Button
                  key="record-payment"
                  icon={<CreditCardOutlined />}
                  onClick={() => {
                    dispatch(erp.currentItem({ data: currentErp }));
                    navigate(`/invoice/pay/${currentErp._id}`);
                  }}
                >
                  {translate('Record Payment')}
                </Button>,
                <Button
                  key="download-pdf"
                  loading={downloadingPdf}
                  onClick={async () => {
                    if (!currentErp) return;
                    setDownloadingPdf(true);
                    try {
                      const projectName = currentErp.sourceProjectId?.name ?? 'Project';
                      const contractorName = currentErp.sourceContractorId?.name ?? currentErp.client?.name ?? '';
                      let logoBase64 = '';
                      let logoSize = null;
                      try {
                        const res = await fetch(logoUrl);
                        const blob = await res.blob();
                        logoBase64 = await new Promise((resolve, reject) => {
                          const r = new FileReader();
                          r.onload = () => resolve(r.result);
                          r.onerror = reject;
                          r.readAsDataURL(blob);
                        });
                        logoSize = await new Promise((resolve) => {
                          const img = new Image();
                          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
                          img.onerror = () => resolve(null);
                          img.src = logoBase64;
                        });
                      } catch (_) {}
                      downloadBillPDF(
                        currentErp,
                        projectName,
                        `KCC-Bill-${currentErp.number ?? 'draft'}.pdf`,
                        contractorName,
                        logoBase64,
                        logoSize,
                      );
                    } finally {
                      setDownloadingPdf(false);
                    }
                  }}
                  icon={<FilePdfOutlined />}
                >
                  {translate('Download PDF')}
                </Button>,
              ]
            : [
                <Button
                  key="download-pdf"
                  onClick={() => {
                    window.open(
                      `${DOWNLOAD_BASE_URL}${entity}/${entity}-${currentErp._id}.pdf`,
                      '_blank'
                    );
                  }}
                  icon={<FilePdfOutlined />}
                >
                  {translate('Download PDF')}
                </Button>,
                <Button
                  key="mail"
                  loading={mailInProgress}
                  onClick={() => send(currentErp._id)}
                  icon={<MailOutlined />}
                >
                  {translate('Send by Email')}
                </Button>,
                <Button
                  key="convert"
                  onClick={() => dispatch(erp.convert({ entity, id: currentErp._id }))}
                  icon={<RetweetOutlined />}
                  style={{ display: entity === 'quote' ? 'inline-block' : 'none' }}
                >
                  {translate('Convert to Invoice')}
                </Button>,
                <Button
                  key="edit"
                  onClick={() => {
                    dispatch(erp.currentAction({ actionType: 'update', data: currentErp }));
                    navigate(`/${entity.toLowerCase()}/update/${currentErp._id}`);
                  }}
                  type="primary"
                  icon={<EditOutlined />}
                >
                  {translate('Edit')}
                </Button>,
              ]),
        ]}
        style={{ padding: '16px 0 20px' }}
      >
        <Row gutter={24} align="middle" style={{ flexWrap: 'nowrap' }}>
          <Col flex="none">
            <Statistic
              title={entity === 'invoice' ? 'Billing stage' : 'Status'}
              value={
                entity === 'invoice'
                  ? (currentErp.billingStage ? String(currentErp.billingStage).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-')
                  : (currentErp.status ? translate(currentErp.status) : '-')
              }
              valueStyle={{ fontSize: 14, fontWeight: 500 }}
            />
          </Col>
          <Col flex="none">
            <Statistic
              title={translate('SubTotal')}
              value={moneyFormatter({
                amount: currentErp.subTotal,
                currency_code: currency,
              })}
              valueStyle={{ fontSize: 14 }}
            />
          </Col>
          <Col flex="none">
            <Statistic
              title={translate('Total')}
              value={moneyFormatter({ amount: currentErp.total, currency_code: currency })}
              valueStyle={{ fontSize: 14 }}
            />
          </Col>
          <Col flex="none">
            <Statistic
              title={translate('Paid')}
              value={moneyFormatter({
                amount: currentErp.credit,
                currency_code: currency,
              })}
              valueStyle={{ fontSize: 14 }}
            />
          </Col>
        </Row>
      </PageHeader>

      <Card size="small" style={{ marginBottom: 24 }}>
          <Descriptions
            title={`${translate('Contractor')}: ${currentErp?.sourceContractorId?.name ?? currentErp?.client?.name ?? '-'}`}
            column={{ xs: 1, sm: 1, md: 3 }}
            size="small"
          >
            <Descriptions.Item label={translate('Address')}>{client?.address ?? '-'}</Descriptions.Item>
            <Descriptions.Item label={translate('email')}>{client?.email ?? '-'}</Descriptions.Item>
            <Descriptions.Item label={translate('Phone')}>{client?.phone ?? '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title={translate('Line Items')} size="small" style={{ marginBottom: 24 }}>
          <Table
            dataSource={itemslist}
            rowKey="_id"
            pagination={false}
            size="small"
            scroll={{ x: 480 }}
            columns={[
              {
                title: '#',
                key: 'index',
                width: 48,
                align: 'center',
                render: (_, __, index) => index + 1,
              },
              {
                title: translate('Product'),
                dataIndex: 'itemName',
                key: 'itemName',
                ellipsis: true,
                render: (name, record) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{name}</div>
                    {record.description ? (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{record.description}</div>
                    ) : null}
                  </div>
                ),
              },
              {
                title: translate('Price'),
                dataIndex: 'price',
                key: 'price',
                width: 120,
                align: 'right',
                render: (val) => moneyFormatter({ amount: val, currency_code: currency }),
              },
              {
                title: translate('Quantity'),
                dataIndex: 'quantity',
                key: 'quantity',
                width: 90,
                align: 'right',
              },
              {
                title: translate('Total'),
                dataIndex: 'total',
                key: 'total',
                width: 120,
                align: 'right',
                render: (val) => moneyFormatter({ amount: val, currency_code: currency }),
                className: 'read-item-total-col',
              },
            ]}
          />
        </Card>

        <Row justify="end" style={{ marginTop: 0 }}>
          <Col xs={24} sm={24} md={12} lg={8}>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Row gutter={[0, 8]} justify="space-between">
                <Col>
                  <span style={{ color: '#666' }}>{translate('Sub Total')}</span>
                </Col>
                <Col>
                  {moneyFormatter({ amount: currentErp.subTotal, currency_code: currency })}
                </Col>
              </Row>
              <Row gutter={[0, 8]} justify="space-between" style={{ marginTop: 8 }}>
                <Col>
                  <span style={{ color: '#666' }}>
                    {translate('Tax Total')} ({currentErp.taxRate ?? 0}%)
                  </span>
                </Col>
                <Col>
                  {moneyFormatter({ amount: currentErp.taxTotal ?? 0, currency_code: currency })}
                </Col>
              </Row>
              <Row gutter={[0, 8]} justify="space-between" style={{ marginTop: 8 }}>
                <Col>
                  <span style={{ color: '#666' }}>{translate('Paid')}</span>
                </Col>
                <Col>
                  {moneyFormatter({ amount: currentErp.credit ?? 0, currency_code: currency })}
                </Col>
              </Row>
              <Row gutter={[0, 8]} justify="space-between" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                <Col>
                  <strong>{translate('Total')}</strong>
                </Col>
                <Col>
                  <strong>{moneyFormatter({ amount: currentErp.total, currency_code: currency })}</strong>
                </Col>
              </Row>
              {entity === 'invoice' && (currentErp.paymentStatus === 'unpaid' || currentErp.paymentStatus === 'partially') && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
                  Paid = amount received so far. Use &quot;Record Payment&quot; to enter payments.
                </div>
              )}
            </Card>
          </Col>
        </Row>
    </div>
  );
}
