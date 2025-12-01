const mongoose = require("mongoose");
const createCRUDController = require("@/controllers/middlewaresControllers/createCRUDController");

function unitsController() {
  const Model = mongoose.model("Units");
  const methods = createCRUDController("Units");

  // Get units by projectCode
  methods.getUnitsByProjectCode = async (req, res) => {
    try {
      const { projectCode } = req.params;

      // ⭐ Correct model for project lookup
      const Project = mongoose.model("Project");

      const project = await Project.findOne({
        projectCode,
        removed: { $ne: true },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          result: null,
          message: `Project not found with project code: ${projectCode}`,
        });
      }

      const units = await Model.find({
        projectId: project._id,
        removed: { $ne: true },
      }).sort({ unitNumber: 1 });

      return res.status(200).json({
        success: true,
        result: units,
        message: `Units found for project code: ${projectCode}`,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  return methods;
}

module.exports = unitsController();