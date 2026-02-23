const express = require('express');
const router = express.Router();
const { catchErrors } = require('@/handlers/errorHandlers');
const labourController = require('@/controllers/appControllers/labourController');

// Routes
// Note: We use catchErrors to prevent server crashes on async errors
router.route('/create').post(catchErrors(labourController.create));
router.route('/read/:id').get(catchErrors(labourController.read));
router.route('/update/:id').patch(catchErrors(labourController.update));
router.route('/delete/:id').delete(catchErrors(labourController.delete));
router.route('/list').get(catchErrors(labourController.list));
router.route('/listAll').get(catchErrors(labourController.listAll));
router.route('/search').get(catchErrors(labourController.search));
router.route('/filter').get(catchErrors(labourController.filter));
router.route('/summary').get(catchErrors(labourController.summary));

module.exports = router;