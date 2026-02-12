// backend/src/controllers/appControllers/inventory/projectInventoryController.js

const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const ProjectInventory = mongoose.model('ProjectInventory');

const projectInventoryController = () => {
  const methods = createCRUDController('ProjectInventory');

  // Override list to populate and filter by project
  methods.list = async (req, res) => {
    try {
      const Model = ProjectInventory;
      const { page = 1, items = 10, sort = 'material', sortBy = 'asc', projectId } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(items);
      const sortValue = sortBy === 'desc' ? -1 : 1;

      let query = { removed: false };

      if (projectId) {
        query.projectId = new mongoose.Types.ObjectId(projectId);
      }

      const result = await Model.find(query)
        .populate('projectId', 'name projectCode')
        .populate('material', 'name category uom specifications')
        .sort({ [sort]: sortValue })
        .skip(skip)
        .limit(parseInt(items));

      const count = await Model.countDocuments(query);

      const pagination = {
        page: parseInt(page),
        items: parseInt(items),
        pages: Math.ceil(count / parseInt(items)),
        count,
      };

      return res.status(200).json({
        success: true,
        result,
        pagination,
        message: 'Successfully found all inventory records',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  // Dashboard summary: Get inventory summary for a project
  methods.dashboard = async (req, res) => {
    try {
      const { projectId } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'projectId is required',
        });
      }

      const result = await ProjectInventory.find({
        projectId: new mongoose.Types.ObjectId(projectId),
        removed: false,
      })
        .populate('material', 'name category uom')
        .populate('projectId', 'name projectCode')
        .sort({ 'material.name': 1 });

      // Calculate totals (robust against null/undefined)
      const totals = result.reduce(
        (acc, inv) => {
          const stock = inv.currentStock ?? 0;
          const rate = inv.avgRate ?? 0;
          return {
            totalReceived: acc.totalReceived + (inv.totalReceived || 0),
            totalConsumed: acc.totalConsumed + (inv.totalConsumed || 0),
            totalValue: acc.totalValue + (stock * rate),
          };
        },
        { totalReceived: 0, totalConsumed: 0, totalValue: 0 }
      );

      return res.status(200).json({
        success: true,
        result: {
          items: result,
          totals,
        },
        message: 'Dashboard data retrieved successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  // Get current stock for a material in a project (for consumption form)
  methods.getCurrentStock = async (req, res) => {
    try {
      const { projectId, materialId } = req.query;

      if (!projectId || !materialId) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'projectId and materialId are required',
        });
      }

      const inventory = await ProjectInventory.findOne({
        projectId: new mongoose.Types.ObjectId(projectId),
        material: new mongoose.Types.ObjectId(materialId),
        removed: false,
      })
        .populate('material', 'name category uom');

      if (!inventory) {
        return res.status(200).json({
          success: true,
          result: {
            currentStock: 0,
            material: null,
          },
          message: 'No inventory record found',
        });
      }

      return res.status(200).json({
        success: true,
        result: {
          currentStock: inventory.currentStock,
          material: inventory.material,
          avgRate: inventory.avgRate,
        },
        message: 'Current stock retrieved',
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
};

module.exports = projectInventoryController;
