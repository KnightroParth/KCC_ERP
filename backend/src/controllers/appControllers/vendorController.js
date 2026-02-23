const mongoose = require('mongoose');
// Ensure the model is registered
require('../../models/appModels/Vendor');

const vendorController = {
  create: async (req, res) => {
    try {
      const Model = mongoose.model('Vendor');
      const document = await Model.create(req.body);
      const result = await Model.findById(document._id);

      return res.status(201).json({
        success: true,
        result,
        message: 'Vendor created successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  list: async (req, res) => {
    try {
      const Model = mongoose.model('Vendor');
      const { page = 1, items = 10, sort = 'created', sortBy = 'desc', enabled, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(items);
      const sortValue = sortBy === 'desc' ? -1 : 1;

      let query = { removed: false };
      if (enabled !== undefined) query.enabled = enabled === 'true';
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ];
      }

      const docs = await Model.find(query)
        .sort({ [sort]: sortValue })
        .skip(skip)
        .limit(parseInt(items));

      const count = await Model.countDocuments(query);

      return res.status(200).json({
        success: true,
        result: docs,
        pagination: {
          page: parseInt(page),
          items: parseInt(items),
          pages: Math.ceil(count / parseInt(items)),
          count,
        },
        message: 'Successfully found all documents',
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  listAll: async (req, res) => {
    try {
      const Model = mongoose.model('Vendor');
      const { enabled } = req.query;
      let query = { removed: false };
      if (enabled !== undefined) query.enabled = enabled === 'true';

      const docs = await Model.find(query).sort({ name: 1 });

      return res.status(200).json({
        success: true,
        result: docs,
        message: 'Successfully found all documents',
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  read: async (req, res) => {
    try {
      const Model = mongoose.model('Vendor');
      const { id } = req.params;
      const result = await Model.findOne({ _id: id, removed: false });
      if (!result) return res.status(404).json({ success: false, message: 'Not found' });
      return res.status(200).json({ success: true, result, message: 'Found' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const Model = mongoose.model('Vendor');
      const { id } = req.params;
      await Model.updateOne({ _id: id }, req.body, { runValidators: true });
      const result = await Model.findById(id);
      return res.status(200).json({ success: true, result, message: 'Updated' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const Model = mongoose.model('Vendor');
      const { id } = req.params;
      const result = await Model.findByIdAndUpdate(id, { removed: true }, { new: true });
      if (!result) return res.status(404).json({ success: false, message: 'Not found' });
      return res.status(200).json({ success: true, result, message: 'Deleted' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  search: async (req, res) => {
    try {
      const Model = mongoose.model('Vendor');
      const { q, fields } = req.query;
      if (!q || !fields) return res.status(400).json({ success: false, message: 'Missing search query' });
      const fieldsArray = fields.split(',');
      const searchQuery = {
        removed: false,
        $or: fieldsArray.map((field) => ({ [field]: { $regex: q, $options: 'i' } })),
      };
      const results = await Model.find(searchQuery).limit(10);
      return res.status(200).json({ success: true, result: results, message: 'Found' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // Placeholder methods for standard CRUD compatibility
  filter: async (req, res) => {
    return res.status(200).json({ success: true, result: [], message: 'Filter not implemented' });
  },

  summary: async (req, res) => {
    return res.status(200).json({ success: true, result: {}, message: 'Summary not implemented' });
  },
};

module.exports = vendorController;
