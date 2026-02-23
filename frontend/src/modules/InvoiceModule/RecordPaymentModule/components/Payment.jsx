import { useState, useEffect } from 'react';

import { Button, Row, Col, Descriptions, Tag, Divider } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import { FileTextOutlined, CloseCircleOutlined } from '@ant-design/icons';

import { useMoney } from '@/settings';

import RecordPayment from './RecordPayment';
import useLanguage from '@/locale/useLanguage';

import { useNavigate } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';

export default function Payment({ config, currentItem }) {
  const translate = useLanguage();
  const { entity, ENTITY_NAME } = config;

  const money = useMoney();
  const navigate = useNavigate();

  const [itemslist, setItemsList] = useState([]);
  const [currentErp, setCurrentErp] = useState(currentItem ?? {});

  const [contractor, setContractor] = useState({});
  useEffect(() => {
    if (currentErp?.sourceContractorId && typeof currentErp.sourceContractorId === 'object') {
      setContractor(currentErp.sourceContractorId);
    } else if (currentErp?.client && typeof currentErp.client === 'object') {
      setContractor(currentErp.client);
    } else {
      setContractor({});
    }
  }, [currentErp]);

  useEffect(() => {
    if (currentItem) {
      setItemsList(currentItem.items ?? []);
      setCurrentErp(currentItem);
    }
  }, [currentItem]);

  const currency = currentErp?.currency ?? 'INR';
  const billToName =
    currentErp?.sourceContractorId?.name ??
    currentErp?.client?.name ??
    currentErp?.contractorDisplayName ??
    '-';

  if (!currentItem || !currentErp._id) {
    return <PageLoader />;
  }

  return (
    <>
      <Row gutter={[12, 12]}>
        <Col
          className="gutter-row"
          xs={{ span: 24 }}
          sm={{ span: 24 }}
          md={{ span: 24 }}
          lg={{ span: 20, push: 2 }}
        >
          <PageHeader
            onBack={() => navigate(`/${entity.toLowerCase()}`)}
            title={`Record Payment for ${ENTITY_NAME} # ${currentErp.number ?? ''}/${currentErp.year ?? ''}`}
            ghost={false}
            tags={<span>{currentErp.paymentStatus ? translate(currentErp.paymentStatus) : '-'}</span>}
            // subTitle="This is cuurent erp page"
            extra={[
              <Button
                key="cancel"
                onClick={() => navigate(`/${entity.toLowerCase()}`)}
                icon={<CloseCircleOutlined />}
              >
                {translate('Cancel')}
              </Button>,
              <Button
                key="show-invoice"
                onClick={() => navigate(`/invoice/read/${currentErp._id}`)}
                icon={<FileTextOutlined />}
              >
                {translate('Show Invoice')}
              </Button>,
            ]}
            style={{
              padding: '20px 0px',
            }}
          ></PageHeader>
          <Divider dashed />
        </Col>
      </Row>
      <Row gutter={[12, 12]}>
        <Col
          className="gutter-row"
          xs={{ span: 24, order: 2 }}
          sm={{ span: 24, order: 2 }}
          md={{ span: 10, order: 2, push: 2 }}
          lg={{ span: 10, order: 2, push: 4 }}
        >
          <div className="space50"></div>
          <Descriptions title={`${translate('Contractor')}: ${billToName}`} column={1}>
            <Descriptions.Item label={translate('email')}>{contractor?.email ?? '-'}</Descriptions.Item>
            <Descriptions.Item label={translate('phone')}>{contractor?.phone ?? '-'}</Descriptions.Item>
            <Divider dashed />
            <Descriptions.Item label={translate('payment status')}>
              <span>{currentErp.paymentStatus ? translate(currentErp.paymentStatus) : '-'}</span>
            </Descriptions.Item>
            <Descriptions.Item label={translate('sub total')}>
              {money.moneyFormatter({ amount: currentErp.subTotal, currency_code: currency })}
            </Descriptions.Item>
            <Descriptions.Item label={translate('total')}>
              {money.moneyFormatter({ amount: currentErp.total, currency_code: currency })}
            </Descriptions.Item>
            <Descriptions.Item label={translate('discount')}>
              {money.moneyFormatter({ amount: currentErp.discount ?? 0, currency_code: currency })}
            </Descriptions.Item>
            <Descriptions.Item label={translate('Paid')}>
              {money.moneyFormatter({ amount: currentErp.credit ?? 0, currency_code: currency })}
            </Descriptions.Item>
          </Descriptions>
        </Col>

        <Col
          className="gutter-row"
          xs={{ span: 24, order: 1 }}
          sm={{ span: 24, order: 1 }}
          md={{ span: 12, order: 1 }}
          lg={{ span: 10, order: 1, push: 2 }}
        >
          <RecordPayment config={config} />
        </Col>
      </Row>
    </>
  );
}
