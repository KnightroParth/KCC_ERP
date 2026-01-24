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
const unitsRouter = require('./routes/appRoutes/unitsRoutes');
const attendanceRouter = require('./routes/appRoutes/attendanceRoutes');

// Load Labour Router
const labourRouter = require('./routes/appRoutes/labourRoutes');

// Load Vendor Router
const vendorRouter = require('./routes/appRoutes/vendorRoutes');

// Load Inventory Router
const inventoryRouter = require('./routes/appRoutes/inventoryRoutes');

// Load AI Router
const aiRouter = require('./routes/appRoutes/aiRoutes');

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ⛔️ DO NOT MOVE THIS — Auth routes (login/register) must be open
app.use('/api', coreAuthRouter);

// ✅ Protected core modules (customers, invoices, etc.)
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);

// ✅ Protected app modules
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);

// ✅ Units custom routes
app.use('/api/units', adminAuth.isValidAuthToken, unitsRouter);

// ✅ Attendance custom routes
app.use('/api/attendance', adminAuth.isValidAuthToken, attendanceRouter);

// ✅ Labour custom routes
app.use('/api/labour', adminAuth.isValidAuthToken, labourRouter);

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