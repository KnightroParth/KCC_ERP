// backend/src/controllers/appControllers/inventory/stockRequirementController.js

const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const StockRequirement = mongoose.model('StockRequirement');
const Project = mongoose.model('Project');
const Material = mongoose.model('Material');
const PurchaseOrder = mongoose.model('PurchaseOrder');

const stockRequirementController = () => {
  const methods = createCRUDController('StockRequirement');

  // Override create to add budget validation
  methods.create = async (req, res) => {
    try {
      // 1. GET CURRENT USER ID (Fix for "requestedBy is required" error)
      const requestedBy = req.admin ? req.admin._id : null;

      if (!requestedBy) {
        return res.status(401).json({
          success: false,
          result: null,
          message: 'User authentication failed. Cannot identify requester.',
        });
      }

      const { projectId, items } = req.body;

      // Get project budget
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Project not found',
        });
      }

      // Calculate estimated cost
      let estimatedCost = 0;
      let budgetExceeded = false;
      let budgetWarning = '';

      if (items && items.length > 0) {
        estimatedCost = items.reduce((sum, item) => {
          return sum + (item.estimatedRate || 0) * (item.quantity || 0);
        }, 0);
      }

      // Check if estimated cost exceeds budget
      const currentSpent = project.actualTotalCost || 0;
      const remainingBudget = project.budget - currentSpent;
      
      if (estimatedCost > remainingBudget) {
        budgetExceeded = true;
        budgetWarning = `Estimated cost (${estimatedCost}) exceeds remaining budget (${remainingBudget}). This is a soft limit - request will be created but requires approval.`;
      } else if (estimatedCost > remainingBudget * 0.8) {
        budgetWarning = `Estimated cost (${estimatedCost}) is above 80% of remaining budget (${remainingBudget}). Please review.`;
      }

      // Create the requirement
      const requirement = await StockRequirement.create({
        ...req.body,
        requestedBy, // ✅ ADDED THIS FIELD
        estimatedCost,
        budgetExceeded,
        budgetWarning: budgetWarning || undefined,
      });

      const result = await StockRequirement.findById(requirement._id)
        .populate('projectId', 'name projectCode budget')
        .populate('requestedBy', 'name email')
        .populate('items.material', 'name category uom');

      return res.status(201).json({
        success: true,
        result,
        message: budgetExceeded 
          ? 'Requirement created with budget warning' 
          : 'Requirement created successfully',
        warning: budgetWarning || undefined,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  // Override list to populate related fields
  methods.list = async (req, res) => {
    try {
      const Model = StockRequirement;
      const { page = 1, items = 10, sort = 'requestDate', sortBy = 'desc', projectId, status } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(items);
      const sortValue = sortBy === 'desc' ? -1 : 1;

      let query = { removed: false };

      if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId);
      if (status && status !== 'All') query.status = status;

      const result = await Model.find(query)
        .populate('projectId', 'name projectCode')
        .populate('requestedBy', 'name email')
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
        message: 'Successfully found all requirements',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  // Special method: Convert Requirement to Purchase Order
  methods.convertToPO = async (req, res) => {
    try {
      const { id } = req.params;
      const { vendor, supplier, terms, notes } = req.body;
      const supplierId = supplier || vendor;

      if (!supplierId) {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Supplier is required',
        });
      }

      // Get the requirement
      const requirement = await StockRequirement.findById(id)
        .populate('items.material', 'name category uom');

      if (!requirement) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Requirement not found',
        });
      }

      if (requirement.status === 'Fulfilled') {
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Cannot convert fulfilled requirement to PO',
        });
      }

      // Create PO items from requirement items
      const poItems = requirement.items.map(item => ({
        material: item.material._id || item.material,
        quantity: item.quantity,
        rate: item.estimatedRate || 0,
        amount: (item.estimatedRate || 0) * item.quantity,
        receivedQuantity: 0,
      }));

      // Create Purchase Order (include projectId from requirement for project-scoping)
      const purchaseOrder = await PurchaseOrder.create({
        supplier: supplierId,
        projectId: requirement.projectId,
        referenceRequirement: requirement._id,
        date: new Date(),
        status: 'Draft',
        items: poItems,
        totalAmount: poItems.reduce((sum, item) => sum + item.amount, 0),
        terms: terms || '',
        notes: notes || '',
      });

      // Update requirement status to Approved
      requirement.status = 'Approved';
      await requirement.save();

      const result = await PurchaseOrder.findById(purchaseOrder._id)
        .populate('supplier', 'name phone email')
        .populate('referenceRequirement', 'requestDate priority')
        .populate('items.material', 'name category uom');

      return res.status(201).json({
        success: true,
        result,
        message: 'Purchase Order created successfully from requirement',
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

module.exports = stockRequirementController;