import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const Logout = lazy(() => import('@/pages/Logout.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Customer = lazy(() => import('@/pages/Customer'));

const Invoice = lazy(() => import('@/pages/Invoice'));
const InvoiceCreate = lazy(() => import('@/pages/Invoice/InvoiceCreate'));
const InvoiceRead = lazy(() => import('@/pages/Invoice/InvoiceRead'));
const InvoiceUpdate = lazy(() => import('@/pages/Invoice/InvoiceUpdate'));
const InvoiceRecordPayment = lazy(() => import('@/pages/Invoice/InvoiceRecordPayment'));

const Quote = lazy(() => import('@/pages/Quote/index'));
const QuoteCreate = lazy(() => import('@/pages/Quote/QuoteCreate'));
const QuoteRead = lazy(() => import('@/pages/Quote/QuoteRead'));
const QuoteUpdate = lazy(() => import('@/pages/Quote/QuoteUpdate'));

const Payment = lazy(() => import('@/pages/Payment/index'));
const PaymentRead = lazy(() => import('@/pages/Payment/PaymentRead'));
const PaymentUpdate = lazy(() => import('@/pages/Payment/PaymentUpdate'));

const Settings = lazy(() => import('@/pages/Settings/Settings'));
const PaymentMode = lazy(() => import('@/pages/PaymentMode'));
const Taxes = lazy(() => import('@/pages/Taxes'));

const Profile = lazy(() => import('@/pages/Profile'));
const About = lazy(() => import('@/pages/About'));

// ✅ Units UI (friend)
const Units = lazy(() => import('@/pages/units'));

// ✅ Projects
const Project = lazy(() => import('@/modules/ProjectModule'));

const Activities = lazy(() => import('@/pages/activities'));
const AssignWork = lazy(() => import('@/pages/AssignWork'));

// ✅ Work Planning UI (friend)
const Planning = lazy(() => import('@/pages/work/planning'));

const Attendance = lazy(() => import('@/pages/Attendance'));
const Labour = lazy(() => import('@/pages/Labour'));
const Vendor = lazy(() => import('@/pages/Vendor'));

// ✅ Supplier (moved to Inventory module)
const Supplier = lazy(() => import('@/pages/Supplier'));

// Inventory Module (your work)
const InventoryDashboard = lazy(() => import('@/pages/Inventory/Dashboard'));
const MaterialLibrary = lazy(() => import('@/pages/Inventory/MaterialLibrary'));
const IndentRequest = lazy(() => import('@/pages/Inventory/IndentRequest'));
const PurchaseOrder = lazy(() => import('@/pages/Inventory/PurchaseOrder'));
const GRN = lazy(() => import('@/pages/Inventory/GRN'));
const Consumption = lazy(() => import('@/pages/Inventory/Consumption'));

let routes = {
  expense: [],
  default: [
    { path: '/login', element: <Navigate to="/" /> },
    { path: '/logout', element: <Logout /> },
    { path: '/about', element: <About /> },

    { path: '/', element: <Dashboard /> },
    { path: '/customer', element: <Customer /> },

    // ✅ Units
    { path: '/units', element: <Units /> },

    { path: '/projects', element: <Project /> },

    // Invoice
    { path: '/invoice', element: <Invoice /> },
    { path: '/invoice/create', element: <InvoiceCreate /> },
    { path: '/invoice/read/:id', element: <InvoiceRead /> },
    { path: '/invoice/update/:id', element: <InvoiceUpdate /> },
    { path: '/invoice/pay/:id', element: <InvoiceRecordPayment /> },

    // Quote
    { path: '/quote', element: <Quote /> },
    { path: '/quote/create', element: <QuoteCreate /> },
    { path: '/quote/read/:id', element: <QuoteRead /> },
    { path: '/quote/update/:id', element: <QuoteUpdate /> },

    // Payment
    { path: '/payment', element: <Payment /> },
    { path: '/payment/read/:id', element: <PaymentRead /> },
    { path: '/payment/update/:id', element: <PaymentUpdate /> },

    // Settings
    { path: '/settings', element: <Settings /> },
    { path: '/settings/edit/:settingsKey', element: <Settings /> },
    { path: '/payment/mode', element: <PaymentMode /> },
    { path: '/taxes', element: <Taxes /> },

    // Work & Activities
    { path: '/activities', element: <Activities /> },
    { path: '/assign-work', element: <AssignWork /> },
    { path: '/work/planning', element: <Planning /> },

    { path: '/attendance', element: <Attendance /> },
    { path: '/labour', element: <Labour /> },
    { path: '/vendor', element: <Vendor /> },

    // Inventory Module (Supplier moved here as last child)
    { path: '/inventory', element: <InventoryDashboard /> },
    { path: '/inventory/materials', element: <MaterialLibrary /> },
    { path: '/inventory/indent', element: <IndentRequest /> },
    { path: '/inventory/purchase-order', element: <PurchaseOrder /> },
    { path: '/inventory/grn', element: <GRN /> },
    { path: '/inventory/consumption', element: <Consumption /> },
    { path: '/inventory/supplier', element: <Supplier /> },

    { path: '/profile', element: <Profile /> },
    { path: '*', element: <NotFound /> },
  ],
};

export default routes;
