// backend/src/controllers/appControllers/inventory/stockTransactionController.js

const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const StockTransaction = mongoose.model('StockTransaction');
const PurchaseOrder = mongoose.model('PurchaseOrder');
const ProjectInventory = mongoose.model('ProjectInventory');

const stockTransactionController = () => {
  const methods = createCRUDController('StockTransaction');

  // Override create to handle transactions atomically and update ProjectInventory
  methods.create = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let { type, projectId, items, purchaseOrder, issuedTo, workActivity, date, notes } = req.body;

      // Filter out items with zero or negative quantity before validation
      if (items && Array.isArray(items)) {
        items = items.filter(item => item && item.quantity && item.quantity > 0);
      }

      // Validation: Check if we have any items after filtering
      if (!items || items.length === 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          result: null,
          message: 'At least one item with quantity greater than 0 is required',
        });
      }

      // Validation
      if (type === 'IN' && !purchaseOrder) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Purchase Order is required for IN transactions',
        });
      }

      if (type === 'OUT' && !issuedTo) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          result: null,
          message: 'Issued To is required for OUT transactions',
        });
      }

      // For IN transactions: Validate against PO
      if (type === 'IN' && purchaseOrder) {
        const po = await PurchaseOrder.findById(purchaseOrder).session(session);
        if (!po) {
          await session.abortTransaction();
          return res.status(404).json({
            success: false,
            result: null,
            message: 'Purchase Order not found',
          });
        }

        // Check if quantities don't exceed PO quantities
        for (const item of items) {
          const poItem = po.items.find(
            pi => pi.material.toString() === item.material.toString()
          );
          
          if (!poItem) {
            await session.abortTransaction();
            return res.status(400).json({
              success: false,
              result: null,
              message: `Material ${item.material} not found in Purchase Order`,
            });
          }

          const alreadyReceived = poItem.receivedQuantity || 0;
          const pendingQty = poItem.quantity - alreadyReceived;

          if (item.quantity > pendingQty) {
            await session.abortTransaction();
            return res.status(400).json({
              success: false,
              result: null,
              message: `Quantity ${item.quantity} exceeds pending quantity ${pendingQty} for material ${item.material}`,
            });
          }

          // Update PO received quantity
          poItem.receivedQuantity = (poItem.receivedQuantity || 0) + item.quantity;
        }

        // Update PO status
        const allReceived = po.items.every(item => 
          (item.receivedQuantity || 0) >= item.quantity
        );
        const someReceived = po.items.some(item => 
          (item.receivedQuantity || 0) > 0
        );

        if (allReceived) {
          po.status = 'Closed';
        } else if (someReceived) {
          po.status = 'Partially Received';
        }

        await po.save({ session });
      }

      // For OUT transactions: Validate stock availability
      if (type === 'OUT') {
        for (const item of items) {
          const inventory = await ProjectInventory.findOne({
            projectId,
            material: item.material,
            removed: false,
          }).session(session);

          if (!inventory || inventory.currentStock < item.quantity) {
            await session.abortTransaction();
            return res.status(400).json({
              success: false,
              result: null,
              message: `Insufficient stock for material ${item.material}. Available: ${inventory?.currentStock || 0}, Requested: ${item.quantity}`,
            });
          }
        }
      }

      // Create Stock Transaction
      const transaction = await StockTransaction.create([{
        projectId,
        date: date || new Date(),
        type,
        purchaseOrder: type === 'IN' ? purchaseOrder : undefined,
        issuedTo: type === 'OUT' ? issuedTo : undefined,
        workActivity: type === 'OUT' ? workActivity : undefined,
        items,
        notes,
      }], { session });

      // Update ProjectInventory for each item
      for (const item of items) {
        const inventory = await ProjectInventory.findOne({
          projectId,
          material: item.material,
          removed: false,
        }).session(session);

        if (!inventory) {
          // Create new inventory record
          await ProjectInventory.create([{
            projectId,
            material: item.material,
            currentStock: type === 'IN' ? item.quantity : -item.quantity,
            totalReceived: type === 'IN' ? item.quantity : 0,
            totalConsumed: type === 'OUT' ? item.quantity : 0,
            avgRate: item.rate || 0,
            lastTransactionDate: date || new Date(),
          }], { session });
        } else {
          // Update existing inventory
          if (type === 'IN') {
            inventory.currentStock += item.quantity;
            inventory.totalReceived += item.quantity;
            
            // Update average rate (weighted average)
            const totalValue = (inventory.avgRate * (inventory.totalReceived - item.quantity)) + 
                              (item.rate * item.quantity);
            inventory.avgRate = totalValue / inventory.totalReceived;
          } else {
            inventory.currentStock -= item.quantity;
            inventory.totalConsumed += item.quantity;
          }
          
          inventory.lastTransactionDate = date || new Date();
          await inventory.save({ session });
        }
      }

      await session.commitTransaction();

      const result = await StockTransaction.findById(transaction[0]._id)
        .populate('projectId', 'name projectCode')
        .populate('purchaseOrder', 'number date vendor')
        .populate('items.material', 'name category uom');

      return res.status(201).json({
        success: true,
        result,
        message: 'Stock transaction created successfully',
      });
    } catch (error) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    } finally {
      session.endSession();
    }
  };

  // Override list to populate related fields
  methods.list = async (req, res) => {
    try {
      const Model = StockTransaction;
      const { page = 1, items = 10, sort = 'date', sortBy = 'desc', projectId, type } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(items);
      const sortValue = sortBy === 'desc' ? -1 : 1;

      let query = { removed: false };

      if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId);
      if (type && type !== 'All') query.type = type;

      const result = await Model.find(query)
        .populate('projectId', 'name projectCode')
        .populate('purchaseOrder', 'number date')
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
        message: 'Successfully found all transactions',
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

module.exports = stockTransactionController;
