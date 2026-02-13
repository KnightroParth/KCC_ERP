import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Card, Row, Col, Typography, Space } from 'antd';
import {
  FileSearchOutlined,
  FileAddOutlined,
  UnorderedListOutlined,
  ArrowRightOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { ErpLayout } from '@/layout';

const { Content } = Layout;
const { Title, Text } = Typography;

const CARD_CONFIG = [
  {
    key: 'planning',
    path: '/billing/planning',
    icon: FileSearchOutlined,
    iconBg: '#e6f4ff',
    iconColor: '#1677ff',
    title: 'Create Bill from Planning',
    description: 'Bill contractors against their completed work. Draft → Audit → Final Check → Download PDF & Record Payment (when you pay the contractor).',
    label: 'From Planning',
  },
  {
    key: 'direct',
    path: '/billing/direct',
    icon: FileAddOutlined,
    iconBg: '#f6ffed',
    iconColor: '#52c41a',
    title: 'Direct Bill',
    description: 'Create a bill to a contractor without linking to planning (ad-hoc or one-off).',
    label: 'Ad-hoc',
  },
  {
    key: 'all',
    path: '/invoice',
    icon: UnorderedListOutlined,
    iconBg: '#f9f0ff',
    iconColor: '#722ed1',
    title: 'All Bills',
    description: 'View all bills to contractors, record payments to contractors, download PDFs, or open any bill.',
    label: 'List',
  },
];

export default function BillingDashboard() {
  const navigate = useNavigate();

  return (
    <ErpLayout>
      <Content className="billing-dashboard-content" style={{ padding: '32px 24px', background: '#fafafa' }}>
        <div style={{ marginBottom: 32 }}>
          <Space align="center" size="middle" style={{ marginBottom: 8 }}>
            <DollarOutlined style={{ fontSize: 28, color: '#1677ff' }} />
            <Title level={3} style={{ margin: 0 }}>Billing</Title>
          </Space>
          <Text type="secondary" style={{ display: 'block' }}>
            Bill contractors against their work (from planning or direct), then record payments when you pay them.
          </Text>
        </div>

        <Row gutter={[24, 24]}>
          {CARD_CONFIG.map((item) => {
            const Icon = item.icon;
            return (
              <Col xs={24} sm={24} md={8} lg={8} key={item.key}>
                <Card
                  hoverable
                  className="billing-dashboard-card"
                  onClick={() => navigate(item.path)}
                  style={{
                    height: '100%',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid #f0f0f0',
                  }}
                  styles={{
                    body: { padding: 0 },
                  }}
                >
                  <div className="billing-dashboard-card-inner">
                    <div
                      className="billing-dashboard-card-header"
                      style={{ background: item.iconBg, color: item.iconColor }}
                    >
                      <Icon style={{ fontSize: 32 }} />
                      <span className="billing-dashboard-card-label">{item.label}</span>
                      <ArrowRightOutlined className="billing-dashboard-card-arrow" style={{ color: item.iconColor }} />
                    </div>
                    <div className="billing-dashboard-card-body">
                      <Title level={5} style={{ marginBottom: 8, fontWeight: 600 }}>
                        {item.title}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
                        {item.description}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Content>
      <style>{`
        .billing-dashboard-content .billing-dashboard-card:hover {
          border-color: #1677ff !important;
          box-shadow: 0 4px 16px rgba(22, 119, 255, 0.12);
        }
        .billing-dashboard-card-inner {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .billing-dashboard-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          min-height: 64px;
        }
        .billing-dashboard-card-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.9;
        }
        .billing-dashboard-card-arrow {
          margin-left: auto;
          font-size: 16px;
          opacity: 0.8;
          transition: transform 0.2s;
        }
        .billing-dashboard-card:hover .billing-dashboard-card-arrow {
          transform: translateX(4px);
        }
        .billing-dashboard-card-body {
          padding: 20px;
          flex: 1;
        }
      `}</style>
    </ErpLayout>
  );
}
