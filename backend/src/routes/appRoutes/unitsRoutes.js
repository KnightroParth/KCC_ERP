const express = require("express");
const router = express.Router();

// ✅ Correct Units model path
const Units = require("../../models/appModels/Units");

// ✅ GET all units (populated project name)
router.get("/listAll", async (req, res) => {
  try {
    const units = await Units.find().populate("projectId", "name");
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ GET units by project ID
router.get("/byProject/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const units = await Units.find({ projectId, removed: { $ne: true } })
      .populate("projectId", "name projectCode")
      .sort({ unitNumber: 1 });
    
    res.status(200).json({
      success: true,
      result: units,
      message: "Successfully found units for project",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
});

// ✅ Create unit
router.post("/create", async (req, res) => {
  try {
    const newUnit = await Units.create(req.body);
    res.json(newUnit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
