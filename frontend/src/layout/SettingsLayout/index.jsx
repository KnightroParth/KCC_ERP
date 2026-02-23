import React from 'react';

import { Layout } from 'antd';
import { Divider, Row, Col } from 'antd';

const { Content } = Layout;

const TopCard = ({ title, cardContent }) => {
  return (
    <div
      className="card-section"
      style={{
        height: '70px',
        minHeight: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h2 className="page-title" style={{ marginBottom: 0, textAlign: 'center' }}>{title}</h2>
    </div>
  );
};

export default function SettingsLayout({
  children,
  topCardTitle,
  topCardContent,
  bottomCardContent,
}) {
  return (
    <Layout className="site-layout" style={{ background: '#fafafa', minHeight: '100vh' }}>
      <Content
        style={{
          padding: '32px 24px',
          margin: '0px auto',
          width: '100%',
          maxWidth: '1100px',
        }}
      >
        <Row gutter={[24, 24]}>
          <Col
            className="gutter-row"
            xs={{ span: 24 }}
            sm={{ span: 24 }}
            md={{ span: 17 }}
            lg={{ span: 18 }}
          >
            <div className="card-section" style={{ minHeight: '480px' }}>
              <div style={{ padding: '24px' }}>
                {children}
              </div>
            </div>
          </Col>
          <Col
            className="gutter-row"
            xs={{ span: 24 }}
            sm={{ span: 24 }}
            md={{ span: 7 }}
            lg={{ span: 6 }}
          >
            <TopCard title={topCardTitle} cardContent={topCardContent} />
            <div className="card-section" style={{ minHeight: '280px', marginTop: '24px' }}>
              <div style={{ padding: '24px' }}>
                <Row gutter={[0, 0]}>{bottomCardContent}</Row>
              </div>
            </div>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
