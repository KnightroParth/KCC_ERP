// backend/src/controllers/appControllers/inventory/stockTransactionController.js

const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const StockTransaction = mongoose.model('StockTransaction');
const PurchaseOrder = mongoose.model('PurchaseOrder');
const ProjectInventory = mongoose.model('ProjectInventory');
const Material = mongoose.model('Material');

const stockTransactionController = () => {
  const methods = createCRUDController('StockTransaction');

  // Override create to handle transactions atomically and update ProjectInventory
  methods.create = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let { type, projectId, items, purchaseOrder, issuedTo, workActivity, date, notes } = req.body;

      // Filter out items with zero or invalid quantities (must be >= 0.01)
      if (items && Array.isArray(items)) {
        items = items.filter(item => {
          const qty = parseFloat(item.quantity);
          return qty !== null && qty !== undefined && !isNaN(qty) && qty >= 0.01;
        });
      }

      // Validation: Check if we have any valid items after filtering
      if (!items || items.length === 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          result: null,
          message: 'At least one item with quantity >= 0.01 is required',
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

        // Update PO status based on received quantities
        const allReceived = po.items.every(item => 
          (item.receivedQuantity || 0) >= item.quantity
        );
        const someReceived = po.items.some(item => 
          (item.receivedQuantity || 0) > 0
        );

        if (allReceived) {
          // All items fully received - mark as Closed
          po.status = 'Closed';
        } else if (someReceived) {
          // Some items received but not all - mark as Received (partially)
          // Note: Status enum is ['Draft', 'Pending', 'Issued', 'Received', 'Closed']
          // 'Received' means partially or fully received
          po.status = 'Received';
        }
        // If nothing received yet, keep current status (usually 'Issued' or 'Pending')

        await po.save({ session });
      }

      // For OUT transactions: Validate stock availability from Material Library (Central Warehouse)
      if (type === 'OUT') {
        for (const item of items) {
          // First check Material Library (Central Warehouse) stock
          const material = await Material.findById(item.material).session(session);
          if (!material) {
            await session.abortTransaction();
            return res.status(404).json({
              success: false,
              result: null,
              message: `Material ${item.material} not found`,
            });
          }

          const materialStock = material.openingStock || 0;
          if (materialStock < item.quantity) {
            await session.abortTransaction();
            return res.status(400).json({
              success: false,
              result: null,
              message: `Insufficient stock in Material Library for ${material.name}. Available: ${materialStock.toFixed(2)}, Requested: ${item.quantity.toFixed(2)}`,
            });
          }

          // Decrease Material Library stock (Central Warehouse)
          material.openingStock = Math.max(0, materialStock - item.quantity);
          await material.save({ session });
        }
      }

      // Update Material Library (Central Warehouse) for IN transactions (GRN receives stock)
      if (type === 'IN') {
        for (const item of items) {
          const material = await Material.findById(item.material).session(session);
          if (material) {
            // Increase Material Library stock when receiving from supplier
            material.openingStock = (material.openingStock || 0) + item.quantity;
            await material.save({ session });
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
          if (type === 'IN') {
            // GRN: Stock received from supplier into Material Library, also allocated to Project
            await ProjectInventory.create([{
              projectId,
              material: item.material,
              currentStock: item.quantity,
              totalReceived: item.quantity,
              totalConsumed: 0,
              avgRate: item.rate || 0,
              lastTransactionDate: date || new Date(),
            }], { session });
          } else {
            // OUT (Issue Stock): Transfer from Material Library to Project Inventory
            // Material Library already decreased above, now increase Project Inventory
            await ProjectInventory.create([{
              projectId,
              material: item.material,
              currentStock: item.quantity, // Stock transferred to project
              totalReceived: item.quantity, // Received from Material Library
              totalConsumed: 0,
              avgRate: item.rate || 0,
              lastTransactionDate: date || new Date(),
            }], { session });
          }
        } else {
          // Update existing inventory
          if (type === 'IN') {
            // GRN: Stock received from supplier into Material Library, also allocated to Project
            inventory.currentStock += item.quantity;
            inventory.totalReceived += item.quantity;
            
            // Update average rate (weighted average)
            const totalValue = (inventory.avgRate * (inventory.totalReceived - item.quantity)) + 
                              (item.rate * item.quantity);
            inventory.avgRate = totalValue / inventory.totalReceived;
          } else {
            // OUT (Issue Stock): Transfer from Material Library to Project Inventory
            // Material Library already decreased above, now increase Project Inventory
            inventory.currentStock += item.quantity;
            inventory.totalReceived += item.quantity;
            
            // Update average rate (weighted average)
            const totalValue = (inventory.avgRate * (inventory.totalReceived - item.quantity)) + 
                              (item.rate * item.quantity);
            inventory.avgRate = totalValue / inventory.totalReceived;
          }
          
          inventory.lastTransactionDate = date || new Date();
          await inventory.save({ session });
        }
      }

      await session.commitTransaction();

      const result = await StockTransaction.findById(transaction[0]._id)
        .populate('projectId', 'name projectCode')
        .populate('purchaseOrder', 'number year date vendor')
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
        .populate('purchaseOrder', 'number year date')
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
