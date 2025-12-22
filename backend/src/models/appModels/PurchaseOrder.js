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
      // required: true, // REMOVED: Auto-generated in pre-save
      index: true,
    },
    year: {
      type: Number,
      // required: true, // REMOVED: Auto-generated in pre-save
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
    status: {
      type: String,
      enum: ['Draft', 'Issued', 'Partially Received', 'Closed'],
      default: 'Draft',
      index: true,
    },
    items: [
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
          // required: true, // REMOVED: Calculated in pre-save
          min: 0,
        },
        receivedQuantity: {
          type: Number,
          default: 0,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
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

  // 2. Calculate Item Amounts & Total Amount
  if (this.items && this.items.length > 0) {
    let total = 0;
    
    this.items.forEach((item) => {
      // Calculate item amount automatically
      item.amount = (item.quantity || 0) * (item.rate || 0);
      total += item.amount;
    });

    this.totalAmount = total;
  } else {
    this.totalAmount = 0;
  }

  this.updated = new Date();
  next();
});

// Indexes
PurchaseOrderSchema.index({ supplier: 1, status: 1 });
PurchaseOrderSchema.index({ status: 1, date: -1 });
PurchaseOrderSchema.index({ number: 1, year: 1 });

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);