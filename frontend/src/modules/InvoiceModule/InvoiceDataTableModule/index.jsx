import { Card, Typography } from 'antd';
import { ErpLayout } from '@/layout';
import ErpPanel from '@/modules/ErpPanelModule';
import useLanguage from '@/locale/useLanguage';
import { CreditCardOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function InvoiceDataTableModule({ config }) {
  const translate = useLanguage();
  const extra = config.getExtraActions || [
    { label: translate('Record Payment'), key: 'recordPayment', icon: <CreditCardOutlined /> },
  ];
  return (
    <ErpLayout>
      <div className="all-bills-page" style={{ padding: '0 24px', maxWidth: 1400, margin: '0 auto' }}>
        <Card
          className="all-bills-card"
          style={{
            marginBottom: 24,
            borderRadius: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>
              View all bills, resume in-progress bills from planning, record payments, or download PDFs. Use <strong>Resume</strong> for bills still in Draft, Audit, or Final Check.
            </Text>
          </div>
          <ErpPanel config={config} extra={extra} />
        </Card>
      </div>
    </ErpLayout>
  );
}
