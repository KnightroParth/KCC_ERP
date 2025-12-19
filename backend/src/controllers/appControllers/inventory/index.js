// backend/src/controllers/appControllers/inventory/index.js

const materialController = require('./materialController')();
const stockRequirementController = require('./stockRequirementController')();
const purchaseOrderController = require('./purchaseOrderController')();
const stockTransactionController = require('./stockTransactionController')();
const projectInventoryController = require('./projectInventoryController')();

module.exports = {
  materialController,
  stockRequirementController,
  purchaseOrderController,
  stockTransactionController,
  projectInventoryController,
};
