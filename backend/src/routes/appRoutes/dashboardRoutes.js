const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const dashboardController = require('@/controllers/appControllers/dashboardController');

const router = express.Router();

router.route('/summary').get(catchErrors(dashboardController.summary));

module.exports = router;
