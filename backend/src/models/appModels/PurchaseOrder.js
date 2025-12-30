const mongoose = require('mongoose');

const PurchaseOrderSchema = new mongoose.Schema(
  {
    removed: {
      type: Boolean,
      default: false,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    number: {
      type: Number,
      index: true,
    },
    year: {
      type: Number,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    referenceRequirement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StockRequirement',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    leadTimeDays: {
      type: Number,
      min: 0,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Draft', 'Issued', 'Partially Received', 'Closed'],
      default: 'Draft',
      index: true,
    },
    items: {
      type: [
        {
          material: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Material',
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
            min: 0.01,
          },
          rate: {
            type: Number,
            required: true,
            min: 0,
          },
          amount: {
            type: Number,
            min: 0,
          },
          receivedQuantity: {
            type: Number,
            default: 0,
          },
          originalIndentQty: {
            type: Number,
            min: 0,
          },
        },
      ],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Purchase Order must have at least one item',
      },
    },
    subTotal: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    taxTotal: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    termsAndConditions: {
      type: String,
      trim: true,
    },
    terms: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    created: {
      type: Date,
      default: Date.now,
    },
    updated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

PurchaseOrderSchema.pre('save', async function (next) {
  // 1. Auto-generate PO number if not provided
  if (!this.number || !this.year) {
    const now = new Date();
    const year = now.getFullYear();
    this.year = year;

    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

    const count = await this.constructor.countDocuments({
      year: year,
      created: { $gte: startOfYear, $lte: endOfYear },
    });

    this.number = count + 1;
  }

  // 2. Calculate Expected Delivery Date if leadTimeDays and date are provided
  if (this.leadTimeDays && this.date) {
    const poDate = new Date(this.date);
    const expectedDate = new Date(poDate);
    expectedDate.setDate(expectedDate.getDate() + this.leadTimeDays);
    this.expectedDeliveryDate = expectedDate;
  }

  // 3. Calculate Item Amounts & Subtotal
  let subTotal = 0;
  if (this.items && this.items.length > 0) {
    this.items.forEach((item) => {
      // Calculate item amount automatically
      item.amount = (item.quantity || 0) * (item.rate || 0);
      subTotal += item.amount;
    });
    this.subTotal = subTotal;
  } else {
    this.subTotal = 0;
  }

  // 4. Calculate Tax and Total
  this.taxTotal = (this.subTotal * (this.taxRate || 0)) / 100;
  this.totalAmount = this.subTotal + this.taxTotal;

  this.updated = new Date();
  next();
});

// Indexes
PurchaseOrderSchema.index({ supplier: 1, status: 1 });
PurchaseOrderSchema.index({ status: 1, date: -1 });
PurchaseOrderSchema.index({ number: 1, year: 1 });

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
