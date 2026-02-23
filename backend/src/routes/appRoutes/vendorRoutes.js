const express = require('express');
const router = express.Router();
const { catchErrors } = require('@/handlers/errorHandlers');
const vendorController = require('@/controllers/appControllers/vendorController');
const isValidAuthToken = require('@/controllers/middlewaresControllers/createAuthMiddleware/isValidAuthToken');

// Protect routes
router.use(isValidAuthToken);

// Routes
router.route('/list').get(catchErrors(vendorController.list));
router.route('/listAll').get(catchErrors(vendorController.listAll));
router.route('/read/:id').get(catchErrors(vendorController.read));
router.route('/create').post(catchErrors(vendorController.create));
router.route('/update/:id').patch(catchErrors(vendorController.update));
router.route('/delete/:id').delete(catchErrors(vendorController.delete));
router.route('/search').get(catchErrors(vendorController.search));

// Placeholders for standard CRUD compatibility
router.route('/filter').get(catchErrors(vendorController.filter));
router.route('/summary').get(catchErrors(vendorController.summary));

module.exports = router;
