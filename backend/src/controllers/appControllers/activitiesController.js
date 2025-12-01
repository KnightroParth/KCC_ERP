const mongoose = require("mongoose");
const createCRUDController = require("@/controllers/middlewaresControllers/createCRUDController");

function activitiesController() {
  const Model = mongoose.model("Activities");
  const methods = createCRUDController("Activities");

  // Override list method to populate projectId and unitId
  const originalList = methods.list;
  methods.list = async (req, res) => {
    try {
      const { page = 1, items = 10, sort = "created", sortBy = "desc" } = req.query;
      
      const skip = (page - 1) * items;
      const sortValue = sortBy === "desc" ? -1 : 1;
      
      const result = await Model.find({ removed: false })
        .populate("projectId", "name projectCode")
        .populate("unitId", "unitNumber towerOrWing")
        .sort({ [sort]: sortValue })
        .skip(skip)
        .limit(parseInt(items));
      
      const count = await Model.countDocuments({ removed: false });
      
      const pagination = {
        page: parseInt(page),
        pages: Math.ceil(count / items),
        count,
      };
      
      return res.status(200).json({
        success: true,
        result,
        pagination,
        message: "Successfully found all documents",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  // Override read method to populate projectId and unitId
  const originalRead = methods.read;
  methods.read = async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await Model.findOne({ _id: id, removed: false })
        .populate("projectId", "name projectCode")
        .populate("unitId", "unitNumber towerOrWing");
      
      if (!result) {
        return res.status(404).json({
          success: false,
          result: null,
          message: "No document found by this id: " + id,
        });
      }
      
      return res.status(200).json({
        success: true,
        result,
        message: "Successfully found document by id: " + id,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  // Override search method to populate projectId and unitId
  const originalSearch = methods.search;
  methods.search = async (req, res) => {
    try {
      const { q, fields } = req.query;
      
      if (!q || !fields) {
        return res.status(400).json({
          success: false,
          result: null,
          message: "Missing search query or fields",
        });
      }
      
      const fieldsArray = fields.split(",");
      const searchQuery = {
        removed: false,
        $or: fieldsArray.map(field => ({
          [field]: { $regex: q, $options: "i" }
        }))
      };
      
      const results = await Model.find(searchQuery)
        .populate("projectId", "name projectCode")
        .populate("unitId", "unitNumber towerOrWing")
        .limit(10);
      
      return res.status(200).json({
        success: true,
        result: results,
        message: "Successfully found documents",
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

module.exports = activitiesController();
