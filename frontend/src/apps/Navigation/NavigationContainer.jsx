import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Layout, Menu } from 'antd';

import { useAppContext } from '@/context/appContext';
import useResponsive from '@/hooks/useResponsive';

import logoText from '@/style/images/logo-text.png';
import "@/style/custom/kcc-brand.css";

import {
  CustomerServiceOutlined,
  ContainerOutlined,
  FileSyncOutlined,
  DashboardOutlined,
  MenuOutlined,
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
    currentPath === 'work/wip' ||
    currentPath === 'activities' ||
    currentPath.startsWith('work/');

  const isBillingActive =
    currentPath === 'billing' ||
    currentPath.startsWith('billing/') ||
    currentPath === 'invoice' ||
    currentPath.startsWith('invoice/');

  // Auto-expand relevant modules
  useEffect(() => {
    const keys = [];
    if (isInventoryActive) keys.push('inventory-module');
    if (isAttendanceActive) keys.push('attendance-module');
    if (isWorkActive) keys.push('work-module');
    if (isBillingActive) keys.push('billing-module');
    setOpenKeys(keys);
  }, [isInventoryActive, isAttendanceActive, isWorkActive, isBillingActive]);

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
      className: 'work-submenu',
      icon: <ToolOutlined style={iconStyle} />,
      label: <span style={parentModuleLabelStyle}>Work</span>,
      children: [
        { key: 'work/planning', label: <Link to="/work/planning" style={{ ...subLinkStyle, color: currentPath === 'work/planning' ? '#ffffff' : '#1677ff' }}>Planning</Link> },
        { key: 'work/wip', label: <Link to="/work/wip" style={{ ...subLinkStyle, color: currentPath === 'work/wip' ? '#ffffff' : '#1677ff' }}>Work in Progress</Link> },
        { key: 'activities', label: <Link to="/activities" style={{ ...subLinkStyle, color: currentPath === 'activities' ? '#ffffff' : '#1677ff' }}>Activities</Link> },
      ],
    },

    // ✅ ATTENDANCE MODULE
    {
      key: 'attendance-module',
      className: 'attendance-submenu',
      icon: <UserOutlined style={iconStyle} />,
      label: <span style={parentModuleLabelStyle}>Attendance</span>,
      children: [
        { key: 'attendance', label: <Link to="/attendance" style={{ ...subLinkStyle, color: currentPath === 'attendance' ? '#ffffff' : '#1677ff' }}>Mark Attendance</Link> },
        { key: 'labour', label: <Link to="/labour" style={{ ...subLinkStyle, color: currentPath === 'labour' ? '#ffffff' : '#1677ff' }}>Manage Staff</Link> },
        { key: 'vendor', label: <Link to="/vendor" style={{ ...subLinkStyle, color: currentPath === 'vendor' ? '#ffffff' : '#1677ff' }}>Manage Contractor</Link> },
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
        { key: 'inventory/site-transfer', label: <Link to="/inventory/site-transfer" style={{ ...subLinkStyle, color: currentPath === 'inventory/site-transfer' ? '#ffffff' : '#1677ff' }}>Site Transfer</Link> },
        // Added Supplier Link Here
        { key: 'inventory/supplier', label: <Link to="/inventory/supplier" style={{ ...subLinkStyle, color: currentPath === 'inventory/supplier' ? '#ffffff' : '#1677ff' }}>Suppliers</Link> },
      ],
    },

    {
      key: 'billing-module',
      icon: <FileSyncOutlined style={iconStyle} />,
      label: <Link to="/billing" style={parentModuleLabelStyle}>Billing</Link>,
      children: [
        { key: 'billing', label: <Link to="/billing" style={{ ...subLinkStyle, color: currentPath === 'billing' ? '#ffffff' : '#1677ff' }}>Billing Dashboard</Link> },
        { key: 'billing/planning', label: <Link to="/billing/planning" style={{ ...subLinkStyle, color: currentPath === 'billing/planning' ? '#ffffff' : '#1677ff' }}>Create from Planning</Link> },
        { key: 'billing/direct', label: <Link to="/billing/direct" style={{ ...subLinkStyle, color: currentPath === 'billing/direct' ? '#ffffff' : '#1677ff' }}>Direct Bill</Link> },
        { key: 'invoice', label: <Link to="/invoice" style={{ ...subLinkStyle, color: currentPath === 'invoice' ? '#ffffff' : '#1677ff' }}>All Bills</Link> },
      ],
    },
    { key: 'about', icon: <ReconciliationOutlined style={iconStyle} />, label: <Link to="/about" style={parentLabelStyle}>About</Link> },
  ];

  return (
    <Sider
      collapsible={collapsible}
      collapsed={collapsible ? isNavMenuClose : collapsible}
      onCollapse={navMenu.collapse}
      className="kcc-sidebar"
      width={256}
      theme="dark"
      style={{
        height: '100vh',
        overflowY: 'auto',
        backgroundColor: '#001529',
        borderRight: '1px solid #f0f0f0'
      }}
    >
      <div className="kcc-logo-container" onClick={() => navigate('/')} style={{ background: '#001529' }}>
        <img src={logoText} alt="KCC Logo" className="kcc-logo" />
      </div>

      <Menu
        items={items}
        mode="inline"
        theme="dark"
        selectedKeys={[currentPath]}
        openKeys={openKeys}
        onOpenChange={setOpenKeys}
        style={{ width: 256, borderRight: 0, backgroundColor: '#001529' }}
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