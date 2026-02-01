import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Card, Row, Col, Typography } from 'antd';
import { FileSearchOutlined, FileAddOutlined } from '@ant-design/icons';
import { ErpLayout } from '@/layout';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const cardStyle = {
  cursor: 'pointer',
  height: '100%',
  borderRadius: 8,
  transition: 'all 0.2s',
  border: '1px solid #f0f0f0',
};
const cardHoverStyle = {
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  borderColor: '#1677ff',
};

export default function BillingDashboard() {
  const navigate = useNavigate();

  return (
    <ErpLayout>
      <Content style={{ padding: '32px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <Title level={3} style={{ marginBottom: 8 }}>Billing</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Choose how you want to create a bill.
          </Paragraph>
        </div>

        <Row gutter={[32, 32]}>
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card
              hoverable
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = cardHoverStyle.boxShadow;
                e.currentTarget.style.borderColor = cardHoverStyle.borderColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#f0f0f0';
              }}
              onClick={() => navigate('/billing/planning')}
            >
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <FileSearchOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
                <Title level={4} style={{ marginBottom: 8 }}>Create Bill from Planning</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  Generate RA Bills based on approved Planning & Work Done.
                </Paragraph>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={24} md={12} lg={12}>
            <Card
              hoverable
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = cardHoverStyle.boxShadow;
                e.currentTarget.style.borderColor = cardHoverStyle.borderColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#f0f0f0';
              }}
              onClick={() => navigate('/billing/direct')}
            >
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <FileAddOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                <Title level={4} style={{ marginBottom: 8 }}>Direct Bill / Ad-hoc</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  Create a quick, standalone invoice without linking to planning.
                </Paragraph>
              </div>
            </Card>
          </Col>
        </Row>
      </Content>
    </ErpLayout>
  );
}
