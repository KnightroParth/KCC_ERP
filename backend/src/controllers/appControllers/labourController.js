const mongoose = require('mongoose');
// Ensure the model is registered
require('../../models/appModels/LabourMaster');

const labourController = {
  create: async (req, res) => {
    try {
      const Model = mongoose.model('LabourMaster');
      // This step triggers the validation against the Schema
      const document = await Model.create(req.body);
      // Populate project details immediately for the response
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

  list: async (req, res) => {
    try {
      const Model = mongoose.model('LabourMaster');
      const { page = 1, items = 10, sort = 'created', sortBy = 'desc', projectId, vendorType, status, search } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(items);
      const sortValue = sortBy === 'desc' ? -1 : 1;

      let query = { removed: false };

      // Filters
      if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId);
      if (vendorType && vendorType !== 'All') query.vendorType = vendorType;
      if (status && status !== 'All') query.status = status;
      
      // Search logic
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { trade: { $regex: search, $options: 'i' } },
          { labourType: { $regex: search, $options: 'i' } }
        ];
      }

      const result = await Model.find(query)
        .populate('projectId', 'name projectCode')
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
        message: 'Successfully found all documents',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  read: async (req, res) => {
    try {
      const Model = mongoose.model('LabourMaster');
      const { id } = req.params;
      const result = await Model.findOne({ _id: id, removed: false }).populate('projectId', 'name projectCode');

      if (!result) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'No document found by this id: ' + id,
        });
      }

      return res.status(200).json({
        success: true,
        result,
        message: 'we found this document by this id: ' + id,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  update: async (req, res) => {
    try {
      const Model = mongoose.model('LabourMaster');
      const { id } = req.params;
      
      const result = await Model.findOneAndUpdate(
        { _id: id, removed: false },
        req.body,
        {
          new: true, // return the new result instead of the old one
          runValidators: true,
        }
      ).populate('projectId', 'name projectCode');

      if (!result) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'No document found by this id: ' + id,
        });
      }

      return res.status(200).json({
        success: true,
        result,
        message: 'we update this document by this id: ' + id,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  delete: async (req, res) => {
    try {
      const Model = mongoose.model('LabourMaster');
      const { id } = req.params;
      
      // Soft delete
      const result = await Model.findByIdAndUpdate(
        id,
        { removed: true },
        { new: true }
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'No document found by this id: ' + id,
        });
      }

      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully Deleted the document by id: ' + id,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  // Required for SelectAsync and other tools
  listAll: async (req, res) => {
    try {
      const Model = mongoose.model('LabourMaster');
      const { sort = 'name', sortBy = 'asc' } = req.query;
      const sortValue = sortBy === 'desc' ? -1 : 1;

      const result = await Model.find({ removed: false, status: 'Active' })
        .sort({ [sort]: sortValue })
        .populate('projectId', 'name projectCode');

      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully found all documents',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  search: async (req, res) => {
    try {
      const Model = mongoose.model('LabourMaster');
      const { q = '' } = req.query;

      if (!q.trim()) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Search query cannot be empty',
        });
      }

      const result = await Model.find({
        removed: false,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { trade: { $regex: q, $options: 'i' } },
        ],
      })
      .populate('projectId', 'name projectCode')
      .limit(20);

      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully found documents',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  },

  filter: async (req, res) => {
    // Basic implementation to satisfy the router
    try {
      const Model = mongoose.model('LabourMaster');
      const { filter } = req.query; 
      // You can expand this logic later
      const result = await Model.find({ removed: false });
      return res.status(200).json({ success: true, result, message: 'Filter not fully implemented yet' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  summary: async (req, res) => {
    try {
       // Basic implementation to satisfy the router
       const Model = mongoose.model('LabourMaster');
       const count = await Model.countDocuments({ removed: false });
       return res.status(200).json({ success: true, result: { count }, message: 'Summary fetch success' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = labourController;