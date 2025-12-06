const mongoose = require('mongoose');
// Ensure the model is registered
require('../../models/appModels/LabourMaster');

const labourController = {
  create: async (req, res) => {
    try {
      const Model = mongoose.model('LabourMaster');
      // This step triggers the validation against the Schema
      const document = await Model.create(req.body);
      const result = await Model.findById(document._id).populate('projectId', 'name projectCode');

      return res.status(201).json({
        success: true,
        result,
        message: 'Labour created successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },
  
  // ... Include the rest of the read/update/delete/list methods from my previous response
  list: async (req, res) => {
    try {
      const Model = mongoose.model('LabourMaster');
      const { page = 1, items = 10, sort = 'created', sortBy = 'desc', projectId, vendorType, status, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(items);
      const sortValue = sortBy === 'desc' ? -1 : 1;

      let query = { removed: false };
      if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId);
      if (vendorType && vendorType !== 'All') query.vendorType = vendorType;
      if (status && status !== 'All') query.status = status;
      if (search) {
        query.$or = [{ name: { $regex: search, $options: 'i' } }, { trade: { $regex: search, $options: 'i' } }];
      }

      const docs = await Model.find(query)
        .populate('projectId', 'name projectCode')
        .sort({ [sort]: sortValue })
        .skip(skip)
        .limit(parseInt(items));

      const count = await Model.countDocuments(query);

      return res.status(200).json({
        success: true,
        result: docs,
        pagination: { page: parseInt(page), items: parseInt(items), pages: Math.ceil(count / parseInt(items)), count },
        message: 'Successfully found all documents',
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  read: async (req, res) => {
    try {
      const Model = mongoose.model('LabourMaster');
      const { id } = req.params;
      const result = await Model.findOne({ _id: id, removed: false }).populate('projectId', 'name projectCode');
      if (!result) return res.status(404).json({ success: false, message: 'Not found' });
      return res.status(200).json({ success: true, result, message: 'Found' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const Model = mongoose.model('LabourMaster');
      const { id } = req.params;
      await Model.updateOne({ _id: id }, req.body, { runValidators: true });
      const result = await Model.findById(id).populate('projectId', 'name projectCode');
      return res.status(200).json({ success: true, result, message: 'Updated' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const Model = mongoose.model('LabourMaster');
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
      const Model = mongoose.model('LabourMaster');
      const { q, fields } = req.query;
      if (!q || !fields) return res.status(400).json({ success: false, message: 'Missing search query' });
      const fieldsArray = fields.split(',');
      const searchQuery = { removed: false, $or: fieldsArray.map((field) => ({ [field]: { $regex: q, $options: 'i' } })) };
      const results = await Model.find(searchQuery).populate('projectId', 'name projectCode').limit(10);
      return res.status(200).json({ success: true, result: results, message: 'Found' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = labourController;