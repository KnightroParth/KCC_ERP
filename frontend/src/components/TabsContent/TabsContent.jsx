import { Tabs, Row, Col } from 'antd';

const SettingsLayout = ({ children }) => {
  return (
    <Col className="gutter-row" order={0}>
      <div className="card-section" style={{ minHeight: '480px' }}>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </Col>
  );
};

const TopCard = ({ pageTitle }) => {
  return (
    <div
      className="card-section"
      style={{
        height: '70px',
        minHeight: 'auto',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h2 className="page-title" style={{ marginBottom: 0, textAlign: 'center' }}>{pageTitle}</h2>
    </div>
  );
};

const RightMenu = ({ children, pageTitle }) => {
  return (
    <Col
      className="gutter-row"
      xs={{ span: 24 }}
      sm={{ span: 24 }}
      md={{ span: 7 }}
      lg={{ span: 6 }}
      order={1}
    >
      <TopCard pageTitle={pageTitle} />
      <div className="card-section">
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </Col>
  );
};

export default function TabsContent({ content, defaultActiveKey, pageTitle }) {
  const items = content.map((item, index) => {
    return {
      key: item.key ? item.key : index + '_' + item.label.replace(/ /g, '_'),
      label: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {item.icon} <span style={{ paddingRight: 30 }}>{item.label}</span>
        </div>
      ),
      children: <SettingsLayout>{item.children}</SettingsLayout>,
    };
  });

  const renderTabBar = (props, DefaultTabBar) => (
    <RightMenu pageTitle={pageTitle}>
      <DefaultTabBar {...props} />
    </RightMenu>
  );

  return (
    <Row gutter={[24, 24]} className="tabContent">
      <Tabs
        tabPosition="right"
        defaultActiveKey={defaultActiveKey}
        hideAdd={true}
        items={items}
        renderTabBar={renderTabBar}
      />
    </Row>
  );
}
