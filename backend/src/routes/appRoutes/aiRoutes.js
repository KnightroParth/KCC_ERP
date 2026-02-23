const express = require('express');
const router = express.Router();
const { catchErrors } = require('@/handlers/errorHandlers');
const { chat } = require('@/controllers/appControllers/aiController');

// POST /api/ai/chat
router.post('/chat', catchErrors(chat));

module.exports = router;
