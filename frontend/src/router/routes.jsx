import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const Logout = lazy(() => import('@/pages/Logout.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));
const NotAuthorized = lazy(() => import('@/pages/NotAuthorized.jsx'));

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Customer = lazy(() => import('@/pages/Customer'));

const Invoice = lazy(() => import('@/pages/Invoice'));
const InvoiceCreate = lazy(() => import('@/pages/Invoice/InvoiceCreate'));
const InvoiceRead = lazy(() => import('@/pages/Invoice/InvoiceRead'));
const InvoiceUpdate = lazy(() => import('@/pages/Invoice/InvoiceUpdate'));
const InvoiceRecordPayment = lazy(() => import('@/pages/Invoice/InvoiceRecordPayment'));

// Billing module (dashboard + sub-modules)
const BillingDashboard = lazy(() => import('@/pages/Billing/BillingDashboard'));
const BillingFromPlanning = lazy(() => import('@/pages/Billing/BillingFromPlanning'));
const DirectBilling = lazy(() => import('@/pages/Billing/DirectBilling'));


const Profile = lazy(() => import('@/pages/Profile'));
const About = lazy(() => import('@/pages/About'));

// ✅ Units UI (friend)
const Units = lazy(() => import('@/pages/units'));

// ✅ Projects
const Project = lazy(() => import('@/modules/ProjectModule'));
// Removed AssignWork import
const WorkInProgress = lazy(() => import('@/pages/work/WorkInProgress'));
// ✅ Work Planning UI (friend)
const Planning = lazy(() => import('@/pages/work/planning'));
const SetRate = lazy(() => import('@/pages/work/SetRate'));

const Attendance = lazy(() => import('@/pages/Attendance'));
const Labour = lazy(() => import('@/pages/Labour'));
const ManageCompanyStaff = lazy(() => import('@/pages/Attendance/ManageCompanyStaff'));
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
const SiteTransfer = lazy(() => import('@/pages/Inventory/SiteTransfer'));
const SelectProject = lazy(() => import('@/pages/SelectProject.jsx'));

let routes = {
  expense: [],
  default: [
    { path: '/login', element: <Navigate to="/" /> },
    { path: '/logout', element: <Logout /> },
    { path: '/about', element: <About /> },
    { path: '/select-project', element: <SelectProject /> },

    { path: '/', element: <Dashboard /> },
    { path: '/customer', element: <Customer /> },

    // ✅ Units
    { path: '/units', element: <Units /> },

    { path: '/projects', element: <Project /> },

    // Billing module (dashboard + sub-modules)
    { path: '/billing', element: <BillingDashboard /> },
    { path: '/billing/planning', element: <BillingFromPlanning /> },
    { path: '/billing/direct', element: <DirectBilling /> },

    // Invoice / Bills list & CRUD
    { path: '/invoice', element: <Invoice /> },
    { path: '/invoice/create', element: <InvoiceCreate /> },
    { path: '/invoice/create-from-planning', element: <Navigate to="/billing/planning" replace /> },
    { path: '/invoice/read/:id', element: <InvoiceRead /> },
    { path: '/invoice/update/:id', element: <InvoiceUpdate /> },
    { path: '/invoice/pay/:id', element: <InvoiceRecordPayment /> },


    // Work
    { path: '/work/wip', element: <WorkInProgress /> },
    { path: '/work/planning', element: <Planning /> },
    { path: '/work/set-rate', element: <SetRate /> },

    { path: '/attendance', element: <Attendance /> },
    { path: '/labour', element: <Labour /> },
    { path: '/attendance/manage-company-staff', element: <ManageCompanyStaff /> },
    { path: '/vendor', element: <Vendor /> },

    // Inventory Module (Supplier moved here as last child)
    { path: '/inventory', element: <InventoryDashboard /> },
    { path: '/inventory/materials', element: <MaterialLibrary /> },
    { path: '/inventory/indent', element: <IndentRequest /> },
    { path: '/inventory/purchase-order', element: <PurchaseOrder /> },
    { path: '/inventory/grn', element: <GRN /> },
    { path: '/inventory/consumption', element: <Consumption /> },
    { path: '/inventory/site-transfer', element: <SiteTransfer /> },
    { path: '/inventory/supplier', element: <Supplier /> },

    { path: '/profile', element: <Profile /> },
    { path: '/not-authorized', element: <NotAuthorized /> },
    { path: '*', element: <NotFound /> },
  ],
};

export default routes;
