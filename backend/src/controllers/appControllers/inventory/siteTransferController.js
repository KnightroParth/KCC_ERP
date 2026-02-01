// backend/src/controllers/appControllers/inventory/siteTransferController.js
// Site Transfer: deduct from source project inventory, add to destination project inventory

const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const SiteTransfer = mongoose.model('SiteTransfer');
const ProjectInventory = mongoose.model('ProjectInventory');

const siteTransferController = () => {
  const methods = createCRUDController('SiteTransfer');

  methods.create = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { fromProjectId, toProjectId, date, items, notes } = req.body;

      if (!fromProjectId || !toProjectId) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          result: null,
          message: 'From Site and To Site (projects) are required',
        });
      }

      if (fromProjectId.toString() === toProjectId.toString()) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          result: null,
          message: 'From Site and To Site must be different',
        });
      }

      let validItems = Array.isArray(items)
        ? items.filter((item) => {
            const qty = parseFloat(item.quantity);
            return item.material && qty !== null && !isNaN(qty) && qty >= 0.01;
          })
        : [];

      if (validItems.length === 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          result: null,
          message: 'At least one item with quantity >= 0.01 is required',
        });
      }

      const fromId = new mongoose.Types.ObjectId(fromProjectId);
      const toId = new mongoose.Types.ObjectId(toProjectId);

      // Validate stock at source for each item
      for (const item of validItems) {
        const inv = await ProjectInventory.findOne({
          projectId: fromId,
          material: item.material,
          removed: false,
        }).session(session);

        const available = inv ? (inv.currentStock || 0) : 0;
        const requested = parseFloat(item.quantity);

        if (requested > available) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            result: null,
            message: `Insufficient stock at source site for this material. Available: ${available.toFixed(2)}, Requested: ${requested.toFixed(2)}`,
          });
        }
      }

      // Deduct from source project inventory
      for (const item of validItems) {
        const inv = await ProjectInventory.findOne({
          projectId: fromId,
          material: item.material,
          removed: false,
        }).session(session);

        if (inv) {
          inv.currentStock = Math.max(0, (inv.currentStock || 0) - parseFloat(item.quantity));
          inv.lastTransactionDate = date || new Date();
          await inv.save({ session });
        }
      }

      // Add to destination project inventory
      for (const item of validItems) {
        const materialId = item.material;
        const qty = parseFloat(item.quantity);
        const rate = parseFloat(item.rate) || 0;

        const destInv = await ProjectInventory.findOne({
          projectId: toId,
          material: materialId,
          removed: false,
        }).session(session);

        if (!destInv) {
          await ProjectInventory.create(
            [
              {
                projectId: toId,
                material: materialId,
                currentStock: qty,
                totalReceived: qty,
                totalConsumed: 0,
                avgRate: rate,
                lastTransactionDate: date || new Date(),
              },
            ],
            { session }
          );
        } else {
          destInv.currentStock = (destInv.currentStock || 0) + qty;
          destInv.totalReceived = (destInv.totalReceived || 0) + qty;
          const totalValue =
            (destInv.avgRate || 0) * (destInv.totalReceived - qty) + rate * qty;
          destInv.avgRate = destInv.totalReceived > 0 ? totalValue / destInv.totalReceived : rate;
          destInv.lastTransactionDate = date || new Date();
          await destInv.save({ session });
        }
      }

      const [transfer] = await SiteTransfer.create(
        [
          {
            fromProjectId: fromId,
            toProjectId: toId,
            date: date || new Date(),
            items: validItems,
            notes: notes || '',
          },
        ],
        { session }
      );

      await session.commitTransaction();

      const result = await SiteTransfer.findById(transfer._id)
        .populate('fromProjectId', 'name projectCode')
        .populate('toProjectId', 'name projectCode')
        .populate('items.material', 'name category uom');

      return res.status(201).json({
        success: true,
        result,
        message: 'Site transfer created successfully',
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

  methods.list = async (req, res) => {
    try {
      const Model = SiteTransfer;
      const {
        page = 1,
        items = 10,
        sort = 'date',
        sortBy = 'desc',
        fromProjectId,
        toProjectId,
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(items);
      const sortValue = sortBy === 'desc' ? -1 : 1;
      let query = { removed: false };

      if (fromProjectId) query.fromProjectId = new mongoose.Types.ObjectId(fromProjectId);
      if (toProjectId) query.toProjectId = new mongoose.Types.ObjectId(toProjectId);

      const result = await Model.find(query)
        .populate('fromProjectId', 'name projectCode')
        .populate('toProjectId', 'name projectCode')
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
        message: 'Site transfers retrieved successfully',
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

module.exports = siteTransferController;
