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
