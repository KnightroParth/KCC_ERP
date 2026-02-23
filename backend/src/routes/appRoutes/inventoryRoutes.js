// backend/src/routes/appRoutes/inventoryRoutes.js

const express = require('express');
const router = express.Router();
const { catchErrors } = require('@/handlers/errorHandlers');
const checkPermission = require('@/middlewares/checkPermission');

const {
  materialController,
  stockRequirementController,
  purchaseOrderController,
  stockTransactionController,
  projectInventoryController,
  siteTransferController,
} = require('@/controllers/appControllers/inventory');
const supplierController = require('@/controllers/appControllers/supplierController')();

const can = (action) => checkPermission('inventory', action);

// Material routes
router.route('/material/create').post(can('create'), catchErrors(materialController.create));
router.route('/material/read/:id').get(can('view'), catchErrors(materialController.read));
router.route('/material/update/:id').patch(can('update'), catchErrors(materialController.update));
router.route('/material/delete/:id').delete(can('delete'), catchErrors(materialController.delete));
router.route('/material/list').get(can('view'), catchErrors(materialController.list));
router.route('/material/listAll').get(can('view'), catchErrors(materialController.listAll));
router.route('/material/search').get(can('view'), catchErrors(materialController.search));
router.route('/material/filter').get(can('view'), catchErrors(materialController.filter));
router.route('/material/summary').get(can('view'), catchErrors(materialController.summary));
router.route('/material/stock').get(can('view'), catchErrors(materialController.getStock));

// Supplier routes (inventory module)
router.route('/supplier/create').post(can('create'), catchErrors(supplierController.create));
router.route('/supplier/read/:id').get(can('view'), catchErrors(supplierController.read));
router.route('/supplier/update/:id').patch(can('update'), catchErrors(supplierController.update));
router.route('/supplier/delete/:id').delete(can('delete'), catchErrors(supplierController.delete));
router.route('/supplier/list').get(can('view'), catchErrors(supplierController.list));
router.route('/supplier/listAll').get(can('view'), catchErrors(supplierController.listAll));
router.route('/supplier/search').get(can('view'), catchErrors(supplierController.search));
router.route('/supplier/filter').get(can('view'), catchErrors(supplierController.filter));
router.route('/supplier/summary').get(can('view'), catchErrors(supplierController.summary));

// Stock Requirement routes
router.route('/requirement/create').post(can('create'), catchErrors(stockRequirementController.create));
router.route('/requirement/read/:id').get(can('view'), catchErrors(stockRequirementController.read));
router.route('/requirement/update/:id').patch(can('update'), catchErrors(stockRequirementController.update));
router.route('/requirement/delete/:id').delete(can('delete'), catchErrors(stockRequirementController.delete));
router.route('/requirement/list').get(can('view'), catchErrors(stockRequirementController.list));
router.route('/requirement/listAll').get(can('view'), catchErrors(stockRequirementController.listAll));
router.route('/requirement/search').get(can('view'), catchErrors(stockRequirementController.search));
router.route('/requirement/filter').get(can('view'), catchErrors(stockRequirementController.filter));
router.route('/requirement/summary').get(can('view'), catchErrors(stockRequirementController.summary));
router.route('/requirement/convertToPO/:id').post(can('create'), catchErrors(stockRequirementController.convertToPO));

// Purchase Order routes
router.route('/purchase-order/create').post(can('create'), catchErrors(purchaseOrderController.create));
router.route('/purchase-order/read/:id').get(can('view'), catchErrors(purchaseOrderController.read));
router.route('/purchase-order/update/:id').patch(can('update'), catchErrors(purchaseOrderController.update));
router.route('/purchase-order/delete/:id').delete(can('delete'), catchErrors(purchaseOrderController.delete));
router.route('/purchase-order/list').get(can('view'), catchErrors(purchaseOrderController.list));
router.route('/purchase-order/listAll').get(can('view'), catchErrors(purchaseOrderController.listAll));
router.route('/purchase-order/search').get(can('view'), catchErrors(purchaseOrderController.search));
router.route('/purchase-order/filter').get(can('view'), catchErrors(purchaseOrderController.filter));
router.route('/purchase-order/summary').get(can('view'), catchErrors(purchaseOrderController.summary));
router.route('/purchase-order/getForGRN/:id').get(can('view'), catchErrors(purchaseOrderController.getForGRN));
router.route('/purchase-order/pdf/:id').get(can('view'), catchErrors(purchaseOrderController.pdf));

// Stock Transaction routes
router.route('/transaction/create').post(can('create'), catchErrors(stockTransactionController.create));
router.route('/transaction/read/:id').get(can('view'), catchErrors(stockTransactionController.read));
router.route('/transaction/update/:id').patch(can('update'), catchErrors(stockTransactionController.update));
router.route('/transaction/delete/:id').delete(can('delete'), catchErrors(stockTransactionController.delete));
router.route('/transaction/list').get(can('view'), catchErrors(stockTransactionController.list));
router.route('/transaction/listAll').get(can('view'), catchErrors(stockTransactionController.listAll));
router.route('/transaction/search').get(can('view'), catchErrors(stockTransactionController.search));
router.route('/transaction/filter').get(can('view'), catchErrors(stockTransactionController.filter));
router.route('/transaction/summary').get(can('view'), catchErrors(stockTransactionController.summary));

// Site Transfer routes (site A → site B)
router.route('/site-transfer/create').post(can('create'), catchErrors(siteTransferController.create));
router.route('/site-transfer/read/:id').get(can('view'), catchErrors(siteTransferController.read));
router.route('/site-transfer/update/:id').patch(can('update'), catchErrors(siteTransferController.update));
router.route('/site-transfer/delete/:id').delete(can('delete'), catchErrors(siteTransferController.delete));
router.route('/site-transfer/list').get(can('view'), catchErrors(siteTransferController.list));
router.route('/site-transfer/listAll').get(can('view'), catchErrors(siteTransferController.listAll));
router.route('/site-transfer/search').get(can('view'), catchErrors(siteTransferController.search));
router.route('/site-transfer/filter').get(can('view'), catchErrors(siteTransferController.filter));
router.route('/site-transfer/summary').get(can('view'), catchErrors(siteTransferController.summary));

// Project Inventory routes
router.route('/inventory/list').get(can('view'), catchErrors(projectInventoryController.list));
router.route('/inventory/read/:id').get(can('view'), catchErrors(projectInventoryController.read));
router.route('/inventory/dashboard').get(can('view'), catchErrors(projectInventoryController.dashboard));
router.route('/inventory/getCurrentStock').get(can('view'), catchErrors(projectInventoryController.getCurrentStock));

// Import route
const importMaterials = require('../../../scripts/importMaterials');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const upload = multer({
  dest: 'src/public/uploads/temp/',
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  },
});

router.route('/material/import').post(
  can('create'),
  upload.single('file'),
  catchErrors(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const filePath = req.file.path;
    try {
      const result = await importMaterials(filePath);

      // Clean up temp file
      fs.unlinkSync(filePath);

      return res.status(200).json({
        success: true,
        result,
        message: 'Materials imported successfully',
      });
    } catch (error) {
      // Clean up temp file even on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  })
);

module.exports = router;
