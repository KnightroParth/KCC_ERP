// backend/src/routes/appRoutes/inventoryRoutes.js

const express = require('express');
const router = express.Router();
const { catchErrors } = require('@/handlers/errorHandlers');

const {
  materialController,
  stockRequirementController,
  purchaseOrderController,
  stockTransactionController,
  projectInventoryController,
  siteTransferController,
} = require('@/controllers/appControllers/inventory');
const supplierController = require('@/controllers/appControllers/supplierController')();

// Material routes
router.route('/material/create').post(catchErrors(materialController.create));
router.route('/material/read/:id').get(catchErrors(materialController.read));
router.route('/material/update/:id').patch(catchErrors(materialController.update));
router.route('/material/delete/:id').delete(catchErrors(materialController.delete));
router.route('/material/list').get(catchErrors(materialController.list));
router.route('/material/listAll').get(catchErrors(materialController.listAll));
router.route('/material/search').get(catchErrors(materialController.search));
router.route('/material/filter').get(catchErrors(materialController.filter));
router.route('/material/summary').get(catchErrors(materialController.summary));
router.route('/material/stock').get(catchErrors(materialController.getStock));

// Supplier routes
router.route('/supplier/create').post(catchErrors(supplierController.create));
router.route('/supplier/read/:id').get(catchErrors(supplierController.read));
router.route('/supplier/update/:id').patch(catchErrors(supplierController.update));
router.route('/supplier/delete/:id').delete(catchErrors(supplierController.delete));
router.route('/supplier/list').get(catchErrors(supplierController.list));
router.route('/supplier/listAll').get(catchErrors(supplierController.listAll));
router.route('/supplier/search').get(catchErrors(supplierController.search));
router.route('/supplier/filter').get(catchErrors(supplierController.filter));
router.route('/supplier/summary').get(catchErrors(supplierController.summary));

// Stock Requirement routes
router.route('/requirement/create').post(catchErrors(stockRequirementController.create));
router.route('/requirement/read/:id').get(catchErrors(stockRequirementController.read));
router.route('/requirement/update/:id').patch(catchErrors(stockRequirementController.update));
router.route('/requirement/delete/:id').delete(catchErrors(stockRequirementController.delete));
router.route('/requirement/list').get(catchErrors(stockRequirementController.list));
router.route('/requirement/listAll').get(catchErrors(stockRequirementController.listAll));
router.route('/requirement/search').get(catchErrors(stockRequirementController.search));
router.route('/requirement/filter').get(catchErrors(stockRequirementController.filter));
router.route('/requirement/summary').get(catchErrors(stockRequirementController.summary));
router.route('/requirement/convertToPO/:id').post(catchErrors(stockRequirementController.convertToPO));

// Purchase Order routes
router.route('/purchase-order/create').post(catchErrors(purchaseOrderController.create));
router.route('/purchase-order/read/:id').get(catchErrors(purchaseOrderController.read));
router.route('/purchase-order/update/:id').patch(catchErrors(purchaseOrderController.update));
router.route('/purchase-order/delete/:id').delete(catchErrors(purchaseOrderController.delete));
router.route('/purchase-order/list').get(catchErrors(purchaseOrderController.list));
router.route('/purchase-order/listAll').get(catchErrors(purchaseOrderController.listAll));
router.route('/purchase-order/search').get(catchErrors(purchaseOrderController.search));
router.route('/purchase-order/filter').get(catchErrors(purchaseOrderController.filter));
router.route('/purchase-order/summary').get(catchErrors(purchaseOrderController.summary));
router.route('/purchase-order/getForGRN/:id').get(catchErrors(purchaseOrderController.getForGRN));
router.route('/purchase-order/pdf/:id').get(catchErrors(purchaseOrderController.pdf));

// Stock Transaction routes
router.route('/transaction/create').post(catchErrors(stockTransactionController.create));
router.route('/transaction/read/:id').get(catchErrors(stockTransactionController.read));
router.route('/transaction/update/:id').patch(catchErrors(stockTransactionController.update));
router.route('/transaction/delete/:id').delete(catchErrors(stockTransactionController.delete));
router.route('/transaction/list').get(catchErrors(stockTransactionController.list));
router.route('/transaction/listAll').get(catchErrors(stockTransactionController.listAll));
router.route('/transaction/search').get(catchErrors(stockTransactionController.search));
router.route('/transaction/filter').get(catchErrors(stockTransactionController.filter));
router.route('/transaction/summary').get(catchErrors(stockTransactionController.summary));

// Site Transfer routes (site A → site B)
router.route('/site-transfer/create').post(catchErrors(siteTransferController.create));
router.route('/site-transfer/read/:id').get(catchErrors(siteTransferController.read));
router.route('/site-transfer/update/:id').patch(catchErrors(siteTransferController.update));
router.route('/site-transfer/delete/:id').delete(catchErrors(siteTransferController.delete));
router.route('/site-transfer/list').get(catchErrors(siteTransferController.list));
router.route('/site-transfer/listAll').get(catchErrors(siteTransferController.listAll));
router.route('/site-transfer/search').get(catchErrors(siteTransferController.search));
router.route('/site-transfer/filter').get(catchErrors(siteTransferController.filter));
router.route('/site-transfer/summary').get(catchErrors(siteTransferController.summary));

// Project Inventory routes
router.route('/inventory/list').get(catchErrors(projectInventoryController.list));
router.route('/inventory/read/:id').get(catchErrors(projectInventoryController.read));
router.route('/inventory/dashboard').get(catchErrors(projectInventoryController.dashboard));
router.route('/inventory/getCurrentStock').get(catchErrors(projectInventoryController.getCurrentStock));

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
