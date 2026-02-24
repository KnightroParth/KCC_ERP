const express = require('express');
const multer = require('multer');
const path = require('path');
const { catchErrors } = require('@/handlers/errorHandlers');
const checkPermission = require('@/middlewares/checkPermission');
const { checkGranularPermission } = require('@/middlewares/checkPermission');
const { ENTITY_TO_MODULE } = require('@/config/roles');
const router = express.Router();

const uploadWorkRates = multer({
  dest: path.join(__dirname, '../../src/public/uploads/temp'),
  fileFilter: (req, file, cb) => {
    const allowed = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only Excel (.xls, .xlsx) or CSV files are allowed'));
  },
}).single('file');

const appControllers = require('@/controllers/appControllers');
const { routesList } = require('@/models/utils');

const routerApp = (entity, controller) => {
  const module = ENTITY_TO_MODULE[entity];
  const can = (action) => (module ? checkPermission(module, action) : (req, res, next) => next());
  const invoiceCreate = entity === 'invoice'
    ? checkGranularPermission('billing', 'invoice.createDraftBill', 'invoice.createDirectBill')
    : can('create');

  router.route(`/${entity}/create`).post(invoiceCreate, catchErrors(controller['create']));
  router.route(`/${entity}/read/:id`).get(can('view'), catchErrors(controller['read']));
  router.route(`/${entity}/update/:id`).patch(
    entity === 'invoice' ? checkGranularPermission('billing', 'invoice.editDraftBill', 'invoice.updateBill') : can('update'),
    catchErrors(controller['update'])
  );
  router.route(`/${entity}/delete/:id`).delete(can('delete'), catchErrors(controller['delete']));
  router.route(`/${entity}/search`).get(can('view'), catchErrors(controller['search']));
  router.route(`/${entity}/list`).get(can('view'), catchErrors(controller['list']));
  router.route(`/${entity}/listAll`).get(can('view'), catchErrors(controller['listAll']));
  router.route(`/${entity}/filter`).get(can('view'), catchErrors(controller['filter']));
  router.route(`/${entity}/summary`).get(can('view'), catchErrors(controller['summary']));

  if (entity === 'activities') {
    router.route(`/${entity}/delete-all`).post(can('delete'), catchErrors(controller['deleteAll']));
  }
  if (entity === 'plannedwork') {
    router.route(`/${entity}/carry-forward`).post(can('update'), catchErrors(controller['carryForward']));
  }
  if (entity === 'invoice') {
    router.route(`/${entity}/mail`).post(checkGranularPermission('billing', 'invoice.sendMail'), catchErrors(controller['mail']));
    router.route(`/${entity}/planning-for-billing`).get(checkGranularPermission('billing', 'invoice.getPlanningForBilling'), catchErrors(controller['getPlanningForBilling']));
    router.route(`/${entity}/mark-paid/:id`).patch(checkGranularPermission('billing', 'invoice.markAsPaid'), catchErrors(controller['markPaid']));
  }
  if (entity === 'workrate') {
    router.route(`/${entity}/rate-for-activity`).get(can('view'), catchErrors(controller['getRateForActivity']));
    router.route(`/${entity}/import`).post(can('create'), uploadWorkRates, catchErrors(controller['importFromExcel']));
  }
};

routesList.forEach(({ entity, controllerName }) => {
  const controller = appControllers[controllerName];
  if (controller) {
    routerApp(entity, controller);
  } else {
    console.warn(`Controller ${controllerName} not found for entity ${entity}`);
  }
});

// Staff (Manage Company Staff) – no Staff model in appModels; register explicitly
const staffController = require('@/controllers/appControllers/staffController');
routerApp('staff', staffController);

// Dashboard summary – no model; unified MD command-center API (any authenticated user)
const dashboardController = require('@/controllers/appControllers/dashboardController');
router.route('/dashboard/summary').get(catchErrors(dashboardController.summary));

module.exports = router;

