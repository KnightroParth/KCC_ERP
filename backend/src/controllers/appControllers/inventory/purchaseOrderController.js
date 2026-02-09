// backend/src/controllers/appControllers/inventory/purchaseOrderController.js

const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const PurchaseOrder = mongoose.model('PurchaseOrder');
const StockRequirement = mongoose.model('StockRequirement');
const pug = require('pug');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const { loadSettings } = require('@/middlewares/settings');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');

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
        .populate('supplier', 'name phone email address')
        .populate('referenceRequirement', 'requestDate priority')
        .populate({
          path: 'items.material',
          select: 'name code unit uom category',
        })
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

  // Override read to populate supplier and materials
  methods.read = async (req, res) => {
    try {
      const { id } = req.params;

      const result = await PurchaseOrder.findOne({ _id: id, removed: false })
        .populate('supplier', 'name phone email address')
        .populate('referenceRequirement', 'requestDate priority')
        .populate({
          path: 'items.material',
          select: 'name code unit uom category',
        });

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

  // Override create to ensure leadTimeDays, taxRate, and terms are saved
  methods.create = async (req, res) => {
    try {
      const body = req.body;
      
      // Ensure leadTimeDays, taxRate, and terms are included
      if (body.leadTimeDays === undefined) body.leadTimeDays = 0;
      if (body.taxRate === undefined) body.taxRate = 0;
      if (body.terms === undefined) body.terms = '';
      
      // Set createdBy if available
      if (req.admin && req.admin._id) {
        body.createdBy = req.admin._id;
      }

      // Auto-generate year and number if not provided (before validation)
      if (!body.year || !body.number) {
        const now = new Date();
        const year = now.getFullYear();
        body.year = year;

        const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

        const count = await PurchaseOrder.countDocuments({
          year: year,
          created: { $gte: startOfYear, $lte: endOfYear },
        });

        body.number = count + 1;
      }

      const result = await PurchaseOrder.create(body);

      // Update requirement status to 'Approved' if PO was created from a requirement
      if (body.referenceRequirement) {
        try {
          const requirement = await StockRequirement.findById(body.referenceRequirement);
          if (requirement && requirement.status === 'Pending') {
            requirement.status = 'Approved';
            await requirement.save();
          }
        } catch (reqError) {
          // Log error but don't fail the PO creation
          console.error('Error updating requirement status:', reqError);
        }
      }

      return res.status(200).json({
        success: true,
        result,
        message: 'Purchase Order created successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  // Override update to ensure leadTimeDays, taxRate, and terms are saved
  methods.update = async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body;

      // Ensure leadTimeDays, taxRate, and terms can be updated
      const updateData = { ...body };
      
      // Calculate expiredDate if leadTimeDays or date changed
      if (updateData.leadTimeDays !== undefined || updateData.date !== undefined) {
        const existingPO = await PurchaseOrder.findById(id);
        const poDate = updateData.date ? new Date(updateData.date) : existingPO.date;
        const leadTime = updateData.leadTimeDays !== undefined ? updateData.leadTimeDays : existingPO.leadTimeDays;
        
        if (leadTime > 0 && poDate) {
          const expectedDate = new Date(poDate);
          expectedDate.setDate(expectedDate.getDate() + leadTime);
          updateData.expiredDate = expectedDate;
        }
      }

      const result = await PurchaseOrder.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

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
        message: 'Purchase Order updated successfully',
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
        .populate('supplier', 'name phone email address')
        .populate('referenceRequirement', 'requestDate priority')
        .populate({
          path: 'items.material',
          select: 'name code unit uom category specifications',
        });

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

  // PDF generation method
  methods.pdf = async (req, res) => {
    try {
      const { id } = req.params;

      // ✅ FIX: Correct Deep Populate syntax for referenceRequirement.projectId
      const po = await PurchaseOrder.findOne({ _id: id, removed: false })
        .populate('supplier', 'name phone email address')
        .populate({
          path: 'referenceRequirement',
          populate: {
             path: 'projectId',
             select: 'name projectCode address'
          }
        })
        .populate({
          path: 'items.material',
          select: 'name code unit uom category',
        })
        .lean();

      if (!po) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Purchase Order not found',
        });
      }

      // ✅ FIX: Map 'expiredDate' (DB field) to 'expectedDeliveryDate' (Template field)
      if (po.expiredDate && !po.expectedDeliveryDate) {
        po.expectedDeliveryDate = po.expiredDate;
      }

      // Calculate totals if missing
      let subTotal = 0;
      if (po.items && po.items.length > 0) {
        po.items.forEach((item) => {
          if (!item.amount) {
            item.amount = (item.quantity || 0) * (item.rate || 0);
          }
          subTotal += item.amount;
        });
      }

      if (!po.subTotal) po.subTotal = subTotal;
      if (!po.taxRate) po.taxRate = 0;
      if (!po.taxTotal) po.taxTotal = (po.subTotal * po.taxRate) / 100;
      if (!po.totalAmount) po.totalAmount = po.subTotal + po.taxTotal;

      // Handle missing materials gracefully - prevent crashes
      po.items = po.items.map((item) => {
        if (!item.material || typeof item.material !== 'object') {
          item.material = {
            name: 'Unknown Material',
            code: '-',
            unit: 'nos',
            uom: 'nos',
            category: '-',
          };
        }
        return item;
      });

      // Load settings
      const settings = await loadSettings();
      const selectedLang = settings['idurar_app_language'] || 'en';
      const translate = useLanguage({ selectedLang });

      const {
        currency_symbol,
        currency_position,
        decimal_sep,
        thousand_sep,
        cent_precision,
        zero_format,
      } = settings;

      const { moneyFormatter } = useMoney({
        settings: {
          currency_symbol,
          currency_position,
          decimal_sep,
          thousand_sep,
          cent_precision,
          zero_format,
        },
      });

      const { dateFormat } = useDate({ settings });
      
      // ✅ FIX: Ensure logo paths are safe strings; default to KCC logo on PDFs
      settings.public_server_file = process.env.PUBLIC_SERVER_FILE || '';
      if (!settings.company_logo || String(settings.company_logo).trim() === '') {
        settings.company_logo = 'public/uploads/setting/kcc-logo.png';
      }

      // Render PDF template
      // ✅ CONFIRMED: Path is correct relative to this controller
      const templatePath = path.join(__dirname, '../../../pdf/PurchaseOrder.pug');
      
      if (!fs.existsSync(templatePath)) {
        return res.status(500).json({
          success: false,
          result: null,
          message: 'PDF template not found at ' + templatePath,
        });
      }

      const htmlContent = pug.renderFile(templatePath, {
        model: po,
        settings,
        translate,
        dateFormat,
        moneyFormatter,
        moment: moment,
      });

      // Generate PDF
      const pdf = require('html-pdf');
      const pdfOptions = {
        format: 'A4',
        orientation: 'portrait',
        border: '10mm',
        timeout: 50000, // Increase timeout
      };

      pdf.create(htmlContent, pdfOptions).toBuffer((error, buffer) => {
        if (error) {
          console.error('PDF Generation Error:', error);
          return res.status(500).json({
            success: false,
            result: null,
            message: 'Error generating PDF: ' + error.message,
          });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=PO-${po.year}-${String(po.number).padStart(4, '0')}.pdf`);
        res.send(buffer);
      });
    } catch (error) {
      console.error('PDF Controller Error:', error);
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