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
      required: false,
    },
    year: {
      type: Number,
      required: false,
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
  // Auto-generate PO number and year if not provided
  if (!this.number || !this.year) {
    const now = new Date();
    const year = now.getFullYear();
    this.year = year;

    // Find the maximum number for this year to ensure uniqueness
    const maxDoc = await this.constructor
      .findOne({ year: year })
      .sort({ number: -1 })
      .select('number')
      .lean();

    // Start from 1 if no documents exist for this year, otherwise increment
    this.number = maxDoc && maxDoc.number ? maxDoc.number + 1 : 1;

    // Handle race condition: check if this number already exists and increment if needed
    let attempts = 0;
    while (attempts < 10) {
      const existing = await this.constructor.findOne({ 
        year: this.year, 
        number: this.number,
        _id: { $ne: this._id } // Exclude current document if updating
      });
      
      if (!existing) {
        break; // Number is available
      }
      
      this.number += 1;
      attempts += 1;
    }
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
// Unique compound index: number must be unique per year
PurchaseOrderSchema.index({ number: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
