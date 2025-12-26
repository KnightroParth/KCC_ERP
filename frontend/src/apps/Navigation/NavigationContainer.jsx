import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Layout, Menu } from 'antd';

import { useAppContext } from '@/context/appContext';
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

  const navigate = useNavigate();

  const [currentPath, setCurrentPath] = useState(location.pathname.slice(1));
  const [openKeys, setOpenKeys] = useState([]);

  useEffect(() => {
    if (location.pathname === '/') {
      setCurrentPath('dashboard');
    } else {
      const path = location.pathname.startsWith('/')
        ? location.pathname.slice(1)
        : location.pathname;
      setCurrentPath(path);
    }
  }, [location.pathname]);

  // Active module checks
  const isInventoryActive = currentPath.includes('inventory');
  const isAttendanceActive =
    currentPath === 'attendance' ||
    currentPath === 'labour' ||
    currentPath === 'vendor';

  const isWorkActive =
    currentPath === 'assign-work' ||
    currentPath === 'activities' ||
    currentPath.startsWith('work/');

  // Auto-expand relevant modules
  useEffect(() => {
    const keys = [];
    if (isInventoryActive) keys.push('inventory-module');
    if (isAttendanceActive) keys.push('attendance-module');
    if (isWorkActive) keys.push('work-module');
    setOpenKeys(keys);
  }, [isInventoryActive, isAttendanceActive, isWorkActive]);

  // Styles
  const parentLabelStyle = { fontSize: '15px', fontWeight: '600' };
  const parentModuleLabelStyle = { fontSize: '15px', fontWeight: '600', color: '#ffffff' };
  const subLinkStyle = { fontSize: '13px', fontWeight: '400' };
  const iconStyle = { fontSize: '18px' };

  const items = [
    { key: 'dashboard', icon: <DashboardOutlined style={iconStyle} />, label: <Link to="/" style={parentLabelStyle}>Dashboard</Link> },
    { key: 'customer', icon: <CustomerServiceOutlined style={iconStyle} />, label: <Link to="/customer" style={parentLabelStyle}>Projects</Link> },
    { key: 'units', icon: <ContainerOutlined style={iconStyle} />, label: <Link to="/units" style={parentLabelStyle}>Units</Link> },

    // ✅ WORK MODULE
    {
      key: 'work-module',
      icon: <ToolOutlined style={iconStyle} />,
      label: <span style={parentModuleLabelStyle}>Work</span>,
      children: [
        { key: 'work/planning', label: <Link to="/work/planning" style={subLinkStyle}>Planning</Link> },
        { key: 'assign-work', label: <Link to="/assign-work" style={subLinkStyle}>Assign Work Titles</Link> },
        { key: 'activities', label: <Link to="/activities" style={subLinkStyle}>Activities</Link> },
      ],
    },

    // ✅ ATTENDANCE MODULE
    {
      key: 'attendance-module',
      icon: <UserOutlined style={iconStyle} />,
      label: <span style={parentModuleLabelStyle}>Attendance</span>,
      children: [
        { key: 'attendance', label: <Link to="/attendance" style={subLinkStyle}>Mark Attendance</Link> },
        { key: 'labour', label: <Link to="/labour" style={subLinkStyle}>Labour Master</Link> },
        { key: 'vendor', label: <Link to="/vendor" style={subLinkStyle}>Vendor Master</Link> },
      ],
    },

    // ✅ INVENTORY MODULE (YOUR STYLING PRESERVED)
    {
      key: 'inventory-module',
      className: 'inventory-submenu',
      icon: <AppstoreAddOutlined style={{ fontSize: '20px', color: '#ffffff' }} />,
      label: <span style={parentModuleLabelStyle}>Inventory</span>,
      children: [
        { key: 'inventory', label: <Link to="/inventory" style={{ ...subLinkStyle, color: currentPath === 'inventory' ? '#ffffff' : '#1677ff' }}>Stock Overview</Link> },
        { key: 'inventory/materials', label: <Link to="/inventory/materials" style={{ ...subLinkStyle, color: currentPath === 'inventory/materials' ? '#ffffff' : '#1677ff' }}>Material Library</Link> },
        { key: 'inventory/indent', label: <Link to="/inventory/indent" style={{ ...subLinkStyle, color: currentPath === 'inventory/indent' ? '#ffffff' : '#1677ff' }}>Indent Request</Link> },
        { key: 'inventory/purchase-order', label: <Link to="/inventory/purchase-order" style={{ ...subLinkStyle, color: currentPath === 'inventory/purchase-order' ? '#ffffff' : '#1677ff' }}>Purchase Orders</Link> },
        { key: 'inventory/grn', label: <Link to="/inventory/grn" style={{ ...subLinkStyle, color: currentPath === 'inventory/grn' ? '#ffffff' : '#1677ff' }}>Receive Stock (GRN)</Link> },
        { key: 'inventory/consumption', label: <Link to="/inventory/consumption" style={{ ...subLinkStyle, color: currentPath === 'inventory/consumption' ? '#ffffff' : '#1677ff' }}>Issue Stock</Link> },
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
      style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0 }}
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
        openKeys={openKeys}
        onOpenChange={setOpenKeys}
        style={{ width: 256 }}
      />
    </Sider>
  );
}

function MobileSidebar() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Button type="text" size="large" onClick={() => setVisible(true)} className="mobile-sidebar-btn" style={{ marginLeft: 25 }}>
        <MenuOutlined style={{ fontSize: 18 }} />
      </Button>

      <Drawer width={250} placement="left" closable={false} onClose={() => setVisible(false)} open={visible}>
        <Sidebar collapsible={false} isMobile />
      </Drawer>
    </>
  );
}