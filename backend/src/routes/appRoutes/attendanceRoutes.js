// backend/src/routes/appRoutes/attendanceRoutes.js

const express = require('express');
const router = express.Router();
const { catchErrors } = require('@/handlers/errorHandlers');

const attendanceController = require('@/controllers/appControllers/attendanceController');
const isValidAuthToken = require('@/controllers/middlewaresControllers/createAuthMiddleware/isValidAuthToken');

// Protect ALL attendance routes
router.use(isValidAuthToken);

// GET /attendance/list - Filter by projectId, date, search
router.get('/list', catchErrors(attendanceController.list));

// POST /attendance/mark - Mark attendance with validations
router.post('/mark', catchErrors(attendanceController.mark));

// GET /attendance/history/:labourId - Get attendance history for a specific labour
router.get('/history/:labourId', catchErrors(attendanceController.history));

module.exports = router;
