/**
 * Public app routes (no auth) - e.g. project list for login screen.
 */
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

router.get('/project/list', async (req, res) => {
  try {
    const Project = mongoose.model('Project');
    const { page = 1, items = 500 } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(500, parseInt(items, 10) || 10);
    const limit = Math.min(500, parseInt(items, 10) || 10);
    const [result, count] = await Promise.all([
      Project.find({ removed: false }).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Project.countDocuments({ removed: false }),
    ]);
    return res.status(200).json({
      success: true,
      result,
      pagination: { page: parseInt(page, 10), count, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, result: [], message: err.message });
  }
});

module.exports = router;
