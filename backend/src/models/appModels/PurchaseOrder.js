const mongoose = require('mongoose');

const PurchaseOrderSchema = new mongoose.Schema(
  {
    removed: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'Admin',
    },
    number: {
      type: Number,
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    expiredDate: {
      type: Date,
    },
    supplier: {
      type: mongoose.Schema.ObjectId,
      ref: 'Supplier',
    },
    projectId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Project',
      index: true,
    },
    referenceRequirement: {
      type: mongoose.Schema.ObjectId,
      ref: 'StockRequirement',
    },
    items: [
      {
        material: {
          type: mongoose.Schema.ObjectId,
          ref: 'Material',
        },
        quantity: {
          type: Number,
          min: 0.01,
        },
        rate: {
          type: Number,
          default: 0,
          min: 0,
        },
        amount: {
          type: Number,
          default: 0,
        },
        receivedQuantity: {
          type: Number,
          default: 0,
        },
        originalIndentQty: {
          type: Number,
        },
      },
    ],
    leadTimeDays: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    subTotal: {
      type: Number,
      default: 0,
    },
    taxTotal: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: 'Draft',
      enum: ['Draft', 'Pending', 'Issued', 'Received', 'Closed'],
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    terms: {
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

// Pre-save hook: Auto-generate PO number and calculate totals
PurchaseOrderSchema.pre('save', async function (next) {
  // Auto-generate PO number if not provided
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

  // Calculate expiredDate (Expected Delivery Date) from leadTimeDays
  if (this.leadTimeDays && this.leadTimeDays > 0 && this.date) {
    const poDate = new Date(this.date);
    const expectedDate = new Date(poDate);
    expectedDate.setDate(expectedDate.getDate() + this.leadTimeDays);
    this.expiredDate = expectedDate;
  }

  // Calculate item amounts and totals
  let subTotal = 0;
  if (this.items && this.items.length > 0) {
    this.items.forEach((item) => {
      // Calculate item amount: quantity * rate
      item.amount = (item.quantity || 0) * (item.rate || 0);
      subTotal += item.amount;
    });
    this.subTotal = subTotal;
  } else {
    this.subTotal = 0;
  }

  // Calculate tax and total
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
