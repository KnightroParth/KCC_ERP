const express = require('express');
const router = express.Router();
const { catchErrors } = require('@/handlers/errorHandlers');
const labourController = require('@/controllers/appControllers/labourController');
const isValidAuthToken = require('@/controllers/middlewaresControllers/createAuthMiddleware/isValidAuthToken');

// Protect routes
router.use(isValidAuthToken);

// Routes
router.route('/list').get(catchErrors(labourController.list));
router.route('/listAll').get(catchErrors(labourController.listAll));
router.route('/read/:id').get(catchErrors(labourController.read));
router.route('/create').post(catchErrors(labourController.create));
router.route('/update/:id').patch(catchErrors(labourController.update));
router.route('/delete/:id').delete(catchErrors(labourController.delete));
router.route('/search').get(catchErrors(labourController.search));

// Placeholders for standard CRUD compatibility
router.route('/filter').get(catchErrors(labourController.filter));
router.route('/summary').get(catchErrors(labourController.summary));

module.exports = router;