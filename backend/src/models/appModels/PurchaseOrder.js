// backend/src/models/appModels/PurchaseOrder.js

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
      unique: true,
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
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
          required: true,
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

  // Calculate total amount from items
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((sum, item) => {
      return sum + (item.amount || 0);
    }, 0);
  }

  this.updated = new Date();
  next();
});

// Indexes
PurchaseOrderSchema.index({ vendor: 1, status: 1 });
PurchaseOrderSchema.index({ status: 1, date: -1 });
PurchaseOrderSchema.index({ number: 1, year: 1 });

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
