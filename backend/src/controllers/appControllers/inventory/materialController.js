// backend/src/controllers/appControllers/inventory/materialController.js

const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const Material = mongoose.model('Material');

const materialController = () => {
  const methods = createCRUDController('Material');

  // Override listAll to ensure it's searchable for SelectAsync
  methods.listAll = async (req, res) => {
    try {
      const { sort = 'name', sortBy = 'asc', search } = req.query;
      const sortValue = sortBy === 'desc' ? -1 : 1;

      let query = { removed: false, enabled: true };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { specifications: { $regex: search, $options: 'i' } },
        ];
      }

      const result = await Material.find(query)
        .sort({ [sort]: sortValue })
        .limit(1000); // Limit for performance

      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully found all materials',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  // Enhanced search for AutoCompleteAsync
  methods.search = async (req, res) => {
    try {
      const { q = '' } = req.query;

      if (!q.trim()) {
        return res.status(200).json({
          success: true,
          result: [],
          message: 'Empty search query',
        });
      }

      const result = await Material.find({
        removed: false,
        enabled: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } },
          { specifications: { $regex: q, $options: 'i' } },
        ],
      })
        .sort({ name: 1 })
        .limit(50);

      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully found materials',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  // Get Material Library stock for a material (for Issue Stock validation)
  methods.getStock = async (req, res) => {
    try {
      const { materialId } = req.query;

      if (!materialId) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'materialId is required',
        });
      }

      const material = await Material.findById(materialId)
        .select('name category uom openingStock');

      if (!material) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Material not found',
        });
      }

      return res.status(200).json({
        success: true,
        result: {
          openingStock: material.openingStock || 0,
          material: {
            _id: material._id,
            name: material.name,
            category: material.category,
            uom: material.uom,
          },
        },
        message: 'Material stock retrieved',
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

module.exports = materialController;
