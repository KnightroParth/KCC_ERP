const express = require('express');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');
const erpApiRouter = require('./routes/appRoutes/appApi');
const dashboardRouter = require('./routes/appRoutes/dashboardRoutes');
const unitsRouter = require('./routes/appRoutes/unitsRoutes');
const attendanceRouter = require('./routes/appRoutes/attendanceRoutes');

// Load Labour Router
const labourRouter = require('./routes/appRoutes/labourRoutes');

// Load Staff Router (Manage Company Staff - creates Admin/login)
const staffRouter = require('./routes/appRoutes/staffRoutes');

// Load Vendor Router
const vendorRouter = require('./routes/appRoutes/vendorRoutes');

// Load Inventory Router
const inventoryRouter = require('./routes/appRoutes/inventoryRoutes');

// Load AI Router
const aiRouter = require('./routes/appRoutes/aiRoutes');

const app = express();

// CORS: use CORS_ORIGIN env (e.g. * or https://your-app.vercel.app) or reflect request origin (Phase 1)
const corsOrigin = process.env.CORS_ORIGIN;
const originValue = !corsOrigin ? true : corsOrigin === '*' ? '*' : corsOrigin.split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: originValue, credentials: originValue !== '*' }));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ⛔️ DO NOT MOVE THIS — Auth routes (login/register) must be open
app.use('/api', coreAuthRouter);

// ✅ Public app routes (no auth) — e.g. project list for login screen
const publicAppRouter = require('./routes/appRoutes/publicAppRouter');
app.use('/api/public', publicAppRouter);

// ✅ Protected core modules (customers, invoices, etc.)
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);

// ✅ Protected app modules
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
// ✅ Master Dashboard (unified summary for MD)
app.use('/api/dashboard', adminAuth.isValidAuthToken, dashboardRouter);

// ✅ Units custom routes
app.use('/api/units', adminAuth.isValidAuthToken, unitsRouter);

// ✅ Attendance custom routes
app.use('/api/attendance', adminAuth.isValidAuthToken, attendanceRouter);

// ✅ Labour custom routes
app.use('/api/labour', adminAuth.isValidAuthToken, labourRouter);

// ✅ Staff custom routes (company staff = Admin users with login)
app.use('/api/staff', adminAuth.isValidAuthToken, staffRouter);

// ✅ Vendor custom routes
app.use('/api/vendor', adminAuth.isValidAuthToken, vendorRouter);

// ✅ Inventory custom routes
app.use('/api/inventory', adminAuth.isValidAuthToken, inventoryRouter);

// ✅ AI Assistant routes
app.use('/api/ai', adminAuth.isValidAuthToken, aiRouter);

app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

const errorHandlers = require('./handlers/errorHandlers');
app.use(errorHandlers.notFound);
app.use(errorHandlers.productionErrors);

module.exports = app;