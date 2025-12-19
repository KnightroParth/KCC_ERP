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
  AppstoreAddOutlined
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
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/') {
      setCurrentPath('dashboard');
    } else {
      // Logic: Matches the key structure below (removing leading slash)
      const path = location.pathname.startsWith('/') ? location.pathname.slice(1) : location.pathname;
      setCurrentPath(path);
    }
  }, [location.pathname]);

  // Check if we are inside the Inventory Module to toggle Golden Icon
  const isInventoryActive = currentPath.includes('inventory');

  // Styles
  const parentLabelStyle = { fontSize: '15px', fontWeight: '600' };
  const subLinkStyle = { fontSize: '13px', fontWeight: '400' }; // Smaller and Lighter
  const iconStyle = { fontSize: '18px' };

  const items = [
    { key: 'dashboard', icon: <DashboardOutlined style={iconStyle} />, label: <Link to="/" style={parentLabelStyle}>Dashboard</Link> },
    { key: 'customer', icon: <CustomerServiceOutlined style={iconStyle} />, label: <Link to="/customer" style={parentLabelStyle}>Projects</Link> },
    { key: 'units', icon: <ContainerOutlined style={iconStyle} />, label: <Link to="/units" style={parentLabelStyle}>Units</Link> },
    { key: 'assign-work', icon: <FileSyncOutlined style={iconStyle} />, label: <Link to="/assign-work" style={parentLabelStyle}>Assign Work Titles</Link> },
    { key: 'activities', icon: <ToolOutlined style={iconStyle} />, label: <Link to="/activities" style={parentLabelStyle}>Activities</Link> },
    { key: 'attendance', icon: <UserOutlined style={iconStyle} />, label: <Link to="/attendance" style={parentLabelStyle}>Attendance</Link> },
    { key: 'labour', icon: <UserOutlined style={iconStyle} />, label: <Link to="/labour" style={parentLabelStyle}>Labour Master</Link> },
    { key: 'vendor', icon: <TeamOutlined style={iconStyle} />, label: <Link to="/vendor" style={parentLabelStyle}>Vendor Master</Link> },
    
    // ✅ CONSTRUCTION INVENTORY MODULE
    {
      key: 'inventory-module',
      // GOLDEN ICON Logic: If active, use Gold color. Else use inherit.
      icon: <AppstoreAddOutlined style={{ fontSize: '20px', color: isInventoryActive ? '#faad14' : 'inherit' }} />, 
      // PARENT: Bigger Text
      label: <span style={parentLabelStyle}>Inventory</span>,
      children: [
        { 
          key: 'inventory', 
          label: <Link to="/inventory" style={subLinkStyle}>Stock Overview</Link> 
        },
        { 
          key: 'inventory/materials', 
          label: <Link to="/inventory/materials" style={subLinkStyle}>Material Library</Link> 
        },
        { 
          key: 'inventory/indent', 
          label: <Link to="/inventory/indent" style={subLinkStyle}>Indent Request</Link> 
        },
        { 
          key: 'inventory/purchase-order', 
          label: <Link to="/inventory/purchase-order" style={subLinkStyle}>Purchase Orders</Link> 
        },
        { 
          key: 'inventory/grn', 
          label: <Link to="/inventory/grn" style={subLinkStyle}>Receive Stock (GRN)</Link> 
        },
        { 
          key: 'inventory/consumption', 
          label: <Link to="/inventory/consumption" style={subLinkStyle}>Issue Stock</Link> 
        },
      ],
    },

    { key: 'invoice', icon: <FileSyncOutlined style={iconStyle} />, label: <Link to="/invoice" style={parentLabelStyle}>Billing</Link> },
    { key: 'quote', icon: <CreditCardOutlined style={iconStyle} />, label: <Link to="/quote" style={parentLabelStyle}>Work Progress</Link> },
    { key: 'payment', icon: <WalletOutlined style={iconStyle} />, label: <Link to="/payment" style={parentLabelStyle}>Contractor Payments</Link> },
    { key: 'taxes', icon: <ShopOutlined style={iconStyle} />, label: <Link to="/taxes" style={parentLabelStyle}>Taxes</Link> },
    { key: 'settings', icon: <SettingOutlined style={iconStyle} />, label: <Link to="/settings" style={parentLabelStyle}>Settings</Link> },
    { key: 'about', icon: <ReconciliationOutlined style={iconStyle} />, label: <Link to="/about" style={parentLabelStyle}>About</Link> },
  ];

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
      <div className="kcc-logo-container" onClick={() => navigate('/')}>
        <img src={logoText} alt="KCC Logo" className="kcc-logo" />
      </div>

      <Menu
        items={items}
        mode="inline"
        theme="light"
        selectedKeys={[currentPath]} 
        // Ensures Inventory stays open when valid
        defaultOpenKeys={isInventoryActive ? ['inventory-module'] : []}
        style={{ width: 256 }}
      />
    </Sider>
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