import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Layout, Menu } from 'antd';

import { useAppContext } from '@/context/appContext';
import useLanguage from '@/locale/useLanguage';
import useResponsive from '@/hooks/useResponsive';

import logoText from '@/style/images/logo-text.png';
import "@/style/custom/kcc-brand.css";

import {
  SettingOutlined,
  CustomerServiceOutlined,
  ContainerOutlined,
  FileSyncOutlined,
  DashboardOutlined,
  CreditCardOutlined,
  MenuOutlined,
  ShopOutlined,
  WalletOutlined,
  ReconciliationOutlined,
  ToolOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

export default function Navigation() {
  const { isMobile } = useResponsive();
  return isMobile ? <MobileSidebar /> : <Sidebar collapsible={false} />;
}

function Sidebar({ collapsible, isMobile = false }) {
  const location = useLocation();
  const { state: stateApp, appContextAction } = useAppContext();
  const { isNavMenuClose } = stateApp;
  const { navMenu } = appContextAction;

  const [currentPath, setCurrentPath] = useState(location.pathname.slice(1));
  const translate = useLanguage();
  const navigate = useNavigate();

  const items = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/">Dashboard</Link> },
    { key: 'customer', icon: <CustomerServiceOutlined />, label: <Link to="/customer">Projects</Link> },
    { key: 'units', icon: <ContainerOutlined />, label: <Link to="/units">Units</Link> },
    { key: 'assign-work', icon: <FileSyncOutlined />, label: <Link to="/assign-work">Assign Work Titles</Link> },
    { key: 'activities', icon: <ToolOutlined />, label: <Link to="/activities">Activities</Link> },
    { key: 'attendance', icon: <UserOutlined />, label: <Link to="/attendance">Attendance</Link> },
    // ✅ Ensure this is present and correct:
    { key: 'labour', icon: <UserOutlined />, label: <Link to="/labour">Labour Master</Link> },
    { key: 'vendor', icon: <TeamOutlined />, label: <Link to="/vendor">Vendor Master</Link> },
    { key: 'invoice', icon: <FileSyncOutlined />, label: <Link to="/invoice">Billing</Link> },
    { key: 'quote', icon: <CreditCardOutlined />, label: <Link to="/quote">Work Progress</Link> },
    { key: 'payment', icon: <WalletOutlined />, label: <Link to="/payment">Contractor Payments</Link> },
    { key: 'taxes', icon: <ShopOutlined />, label: <Link to="/taxes">Taxes</Link> },
    { key: 'settings', icon: <SettingOutlined />, label: <Link to="/settings">Settings</Link> },
    { key: 'about', icon: <ReconciliationOutlined />, label: <Link to="/about">About</Link> },
  ];

  useEffect(() => {
    setCurrentPath(location.pathname === '/' ? 'dashboard' : location.pathname.slice(1));
  }, [location.pathname]);

  return (
    <Sider
      collapsible={collapsible}
      collapsed={collapsible ? isNavMenuClose : collapsible}
      onCollapse={navMenu.collapse}
      className="kcc-sidebar"
      width={256}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
      theme="light"
    >

      {/* ✅ Brand Logo */}
      < div className="kcc-logo-container" onClick={() => navigate('/')}>
        <img src={logoText} alt="KCC Logo" className="kcc-logo" />
      </div >

      {/* ✅ Menu */}
      < Menu
        items={items}
        mode="inline"
        theme="light"
        selectedKeys={[currentPath]}
        style={{ width: 256 }}
      />

    </Sider >
  );
}

function MobileSidebar() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Button
        type="text"
        size="large"
        onClick={() => setVisible(true)}
        className="mobile-sidebar-btn"
        style={{ marginLeft: 25 }}
      >
        <MenuOutlined style={{ fontSize: 18 }} />
      </Button>

      <Drawer width={250} placement="left" closable={false} onClose={() => setVisible(false)} open={visible}>
        <Sidebar collapsible={false} isMobile />
      </Drawer>
    </>
  );
}
