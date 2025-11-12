// backend/src/controllers/appControllers/unitsController.js

const Units = require("@/models/appModels/Units");

module.exports = {
  async create(req, res) {
    try {
      const unit = await Units.create(req.body);
      res.status(201).json(unit);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async read(req, res) {
    try {
      const unit = await Units.findById(req.params.id).populate("projectId", "name");
      res.status(200).json(unit);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async update(req, res) {
    try {
      const unit = await Units.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      res.status(200).json(unit);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async delete(req, res) {
    try {
      await Units.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: "Unit deleted" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async list(req, res) {
    try {
      const units = await Units.find().populate("projectId", "name");
      res.status(200).json(units);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async listAll(req, res) {
    try {
      const units = await Units.find().populate("projectId", "name"); // ✅ FIXED
      res.status(200).json(units);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};
