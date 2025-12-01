// backend/src/controllers/appControllers/activitiesController.js
const mongoose = require("mongoose");
const createCRUDController = require("@/controllers/middlewaresControllers/createCRUDController");

function activitiesController() {
  const Model = mongoose.model("Activities");
  const methods = createCRUDController("Activities");

  // Helper to add display fields for table
  const addDisplayFields = (doc) => {
    if (!doc) return doc;
    const obj = doc.toObject ? doc.toObject() : doc;

    const project = obj.projectId;
    const unit = obj.unitId;

    obj.projectDisplay = project
      ? [project.name, project.projectCode].filter(Boolean).join(" ")
      : "";

    obj.unitDisplay = unit
      ? unit.towerOrWing
        ? `${unit.unitNumber} - ${unit.towerOrWing}`
        : unit.unitNumber
      : "";

    return obj;
  };

  /* ============================================
      LIST — populate project & unit + add display fields
  ============================================= */
  methods.list = async (req, res) => {
    try {
      const { page = 1, items = 10, sort = "created", sortBy = "desc" } = req.query;

      const skip = (page - 1) * items;
      const sortValue = sortBy === "desc" ? -1 : 1;

      const docs = await Model.find({ removed: false })
        .populate("projectId", "name projectCode")
        .populate("unitId", "unitNumber towerOrWing")
        .sort({ [sort]: sortValue })
        .skip(skip)
        .limit(parseInt(items));

      const result = docs.map(addDisplayFields);

      const count = await Model.countDocuments({ removed: false });

      const pagination = {
        page: parseInt(page),
        items: parseInt(items),
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
      return res
        .status(500)
        .json({ success: false, result: null, message: error.message });
    }
  };

  /* ============================================
      READ — populate project & unit
  ============================================= */
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
      return res
        .status(500)
        .json({ success: false, result: null, message: error.message });
    }
  };

  /* ============================================
      CREATE — return populated result
  ============================================= */
  methods.create = async (req, res) => {
    try {
      const document = await Model.create(req.body);
      const result = await Model.findById(document._id)
        .populate("projectId", "name projectCode")
        .populate("unitId", "unitNumber towerOrWing");

      return res.status(201).json({
        success: true,
        result,
        message: "Document created successfully",
      });
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, result: null, message: error.message });
    }
  };

  /* ============================================
      UPDATE — return populated updated result
  ============================================= */
  methods.update = async (req, res) => {
    try {
      const { id } = req.params;

      await Model.updateOne({ _id: id }, req.body, { runValidators: true });
      const result = await Model.findById(id)
        .populate("projectId", "name projectCode")
        .populate("unitId", "unitNumber towerOrWing");

      return res.status(200).json({
        success: true,
        result,
        message: "Document updated successfully",
      });
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, result: null, message: error.message });
    }
  };

  /* ============================================
      SEARCH — populate project & unit
  ============================================= */
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
        $or: fieldsArray.map((field) => ({
          [field]: { $regex: q, $options: "i" },
        })),
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
      return res
        .status(500)
        .json({ success: false, result: null, message: error.message });
    }
  };

  return methods;
}

module.exports = activitiesController();