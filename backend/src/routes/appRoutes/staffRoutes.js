const express = require('express');
const router = express.Router();
const { catchErrors } = require('@/handlers/errorHandlers');
const staffController = require('@/controllers/appControllers/staffController');

router.route('/create').post(catchErrors(staffController.create));
router.route('/read/:id').get(catchErrors(staffController.read));
router.route('/update/:id').patch(catchErrors(staffController.update));
router.route('/delete/:id').delete(catchErrors(staffController.delete));
router.route('/list').get(catchErrors(staffController.list));
router.route('/listAll').get(catchErrors(staffController.listAll));
router.route('/search').get(catchErrors(staffController.search));
router.route('/filter').get(catchErrors(staffController.filter));
router.route('/summary').get(catchErrors(staffController.summary));

module.exports = router;
