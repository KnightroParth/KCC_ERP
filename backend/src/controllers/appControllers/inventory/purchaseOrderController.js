// backend/src/controllers/appControllers/inventory/purchaseOrderController.js

const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const PurchaseOrder = mongoose.model('PurchaseOrder');

const purchaseOrderController = () => {
  const methods = createCRUDController('PurchaseOrder');

  // Override list to populate related fields
  methods.list = async (req, res) => {
    try {
      const Model = PurchaseOrder;
      const { page = 1, items = 10, sort = 'date', sortBy = 'desc', supplier, status } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(items);
      const sortValue = sortBy === 'desc' ? -1 : 1;

      let query = { removed: false };

      if (supplier) query.supplier = new mongoose.Types.ObjectId(supplier);
      if (status && status !== 'All') query.status = status;

      const result = await Model.find(query)
        .populate('supplier', 'name phone email')
        .populate('referenceRequirement', 'requestDate priority')
        .populate('items.material', 'name category uom')
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
        message: 'Successfully found all purchase orders',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  // Override read to populate supplier
  methods.read = async (req, res) => {
    try {
      const { id } = req.params;

      const result = await PurchaseOrder.findOne({ _id: id, removed: false })
        .populate('supplier', 'name phone email')
        .populate('referenceRequirement', 'requestDate priority')
        .populate('items.material', 'name category uom');

      if (!result) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Purchase Order not found',
        });
      }

      return res.status(200).json({
        success: true,
        result,
        message: 'Purchase Order found',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  // Get PO by ID with full details (for GRN form)
  methods.getForGRN = async (req, res) => {
    try {
      const { id } = req.params;

      const result = await PurchaseOrder.findById(id)
        .populate('supplier', 'name phone email')
        .populate('referenceRequirement', 'requestDate priority')
        .populate('items.material', 'name category uom specifications');

      if (!result) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Purchase Order not found',
        });
      }

      return res.status(200).json({
        success: true,
        result,
        message: 'Purchase Order found',
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

module.exports = purchaseOrderController;
