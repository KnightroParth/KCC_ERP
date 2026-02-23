const express = require("express");
const router = express.Router();

const Units = require("../../models/appModels/Units");
const unitsController = require("../../controllers/appControllers/unitsController");

// Correct auth middleware path
const isValidAuthToken = require("../../controllers/middlewaresControllers/createAuthMiddleware/isValidAuthToken");

// Protect ALL units routes
router.use(isValidAuthToken);

// List all units
router.get("/listAll", async (req, res) => {
  try {
    const units = await Units.find().populate("projectId", "name projectCode");
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get units by project ID
router.get("/byProject/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const units = await Units.find({ projectId, removed: { $ne: true } })
      .populate("projectId", "name projectCode")
      .sort({ unitNumber: 1 });

    res.status(200).json({
      success: true,
      result: units,
      message: "Units fetched",
    });
  } catch (error) {
    res.status(500).json({ success: false, result: null, message: error.message });
  }
});

// Get units by project code
router.get("/byProjectCode/:projectCode", unitsController.getUnitsByProjectCode);

// Create unit
router.post("/create", async (req, res) => {
  try {
    const newUnit = await Units.create(req.body);
    res.status(201).json(newUnit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;